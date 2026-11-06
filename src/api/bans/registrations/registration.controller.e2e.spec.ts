import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {v4 as uuidv4} from 'uuid'

import {BanRegistrationModule} from './registration.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {TaskAgentHelper} from '~/helpers/task-agent.helper'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

describe('Ban Registrations', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let taskAgent: TaskAgentHelper
    let authHeader: [string, string]
    let banId: string
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const bannedUsername = `e2eban${process.env.JEST_WORKER_ID}x${Date.now()}`
    const bannedDomain = 'e2e-ban.invalid'
    const bannedKey = `${bannedUsername}@${bannedDomain}`
    const lastAuth = Math.floor(Date.now() / 1000)

    // the fixture sets the LB htable entries through the task agent like the API deletes it
    const invokeBanTask = async (task: string, extraArgs: string): Promise<void> => {
        const {publishChannel, feedbackChannel, request} = taskAgent.buildRequest({
            feedbackChannel: `ngcp-rest-api-e2e-${task}`,
            task,
            dst: '*|state=active;role=proxy',
            data: JSON.stringify({extra_args: extraArgs}),
        })
        await taskAgent.invokeTask(publishChannel, feedbackChannel, request)
    }

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [BanRegistrationModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)
        taskAgent = moduleRef.get<TaskAgentHelper>(TaskAgentHelper, {strict: false})

        app = moduleRef.createNestApplication()

        app.setGlobalPrefix('api')
        app.useGlobalPipes(new ValidateInputPipe({
            forbidUnknownValues: false,
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            disableErrorMessages: true,
        }))
        app.useGlobalFilters(new HttpExceptionFilter())
        app.useGlobalInterceptors(
            new TransformInterceptor({
                pageName: AppService.config.common.api_default_query_page_name,
                perPageName: AppService.config.common.api_default_query_rows_name,
            }),
            new LoggingInterceptor(),
            new ClassSerializerInterceptor(app.get(Reflector)),
            new TransactionInterceptor(app.get(Reflector)),
            new ResponseValidationInterceptor(),
        )
        app.use(bodyParser.json({
            type: ['application/json-patch+json', 'application/json'],
        }))
        app.getHttpAdapter().getInstance().disable('x-powered-by')
        app.getHttpAdapter().getInstance().set('json spaces', 2)

        await app.init()

        await db.billing.Admin.delete({login: creds.username})
        const adminRole = await db.billing.AclRole.findOneByOrFail({role: RbacRole.admin})
        await db.billing.Admin.insert({
            reseller_id: 1,
            login: creds.username,
            saltedpass: 'mockAdminSaltedpass',
            saltedpass_modify_timestamp: new Date(),
            role_id: adminRole.id,
            is_master: true,
            is_superuser: true,
            is_system: false,
            is_ccare: false,
            lawful_intercept: false,
            is_active: true,
            read_only: false,
            show_passwords: true,
            call_data: true,
            billing_data: true,
            can_reset_password: true,
            enable_2fa: false,
            show_otp_registration_info: false,
        })

        // a registration ban is an auth_count and a last_auth entry
        await invokeBanTask('kam_lb_security_ban_auth_set', `${bannedKey}::auth_count 3`)
        await invokeBanTask('kam_lb_security_ban_auth_set', `${bannedKey}::last_auth ${lastAuth}`)
    })

    afterAll(async () => {
        if (appService.db.isInitialized)
            await appService.db.destroy()
        await app.close()
    })

    it('should be defined', () => {
        expect(app).toBeDefined()
    })

    it('db connection', () => {
        expect(appService.isDbInitialised).toBe(true)
        expect(appService.isDbAvailable).toBe(true)
    })

    it('mock authService.compareBcryptPassword', async () => {
        jest.spyOn(authService, 'compareBcryptPassword').mockImplementation(async () => true)
        expect(await authService.compareBcryptPassword('123', '456')).toBe(true)
    })

    it('obtain auth token', async () => {
        const response = await request(app.getHttpServer())
            .post('/api/auth/jwt')
            .set('Accept', 'application/json')
            .set('Content-Type', 'application/json')
            .send(creds)
        expect(response.status).toEqual(201)
        expect(response.body['access_token']).toBeDefined()
        authHeader = ['Authorization', 'Bearer ' + response.body['access_token']]
    })

    describe('', () => { // main tests block
        describe('GET', () => {
            it('read ban registrations filtered by username and domain', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/bans/registrations?username=${bannedUsername}&domain=${bannedDomain}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(1)
                expect(response.body.data).toHaveLength(1)
                expect(response.body.data[0]).toEqual({
                    id: expect.stringMatching(/^[0-9a-f-]{36}$/),
                    username: bannedUsername,
                    domain: bannedDomain,
                    auth_count: 3,
                    last_auth: new Date(lastAuth * 1000).toISOString(),
                })
                banId = response.body.data[0].id
            })

            it('read ban registration by id', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/bans/registrations/${banId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body).toEqual({
                    id: banId,
                    username: bannedUsername,
                    domain: bannedDomain,
                    auth_count: 3,
                    last_auth: new Date(lastAuth * 1000).toISOString(),
                })
            })

            it('read unknown ban registration returns 404', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/bans/registrations/${uuidv4()}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('Ban Registrations DELETE', () => {
        it('delete ban registration', async () => {
            expect(banId).toBeDefined()
            const response = await request(app.getHttpServer())
                .delete(`/api/bans/registrations/${banId}`)
                .set(...authHeader)
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
            expect(response.status).toEqual(204)

            const read = await request(app.getHttpServer())
                .get(`/api/bans/registrations/${banId}`)
                .set(...authHeader)
                .set('Accept', 'application/json')
            expect(read.status).toEqual(404)
        })

        it('delete fixture htable entries', async () => {
            await invokeBanTask('kam_lb_security_ban_delete', `auth ${bannedKey}::auth_count`)
            await invokeBanTask('kam_lb_security_ban_delete', `auth ${bannedKey}::last_auth`)
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})
