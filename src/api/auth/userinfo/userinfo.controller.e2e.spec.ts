import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'

import {AuthUserinfoModule} from './userinfo.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

describe('', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let adminId: number
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const goneLogin = `mockGoneAdmin${process.env.JEST_WORKER_ID}${Date.now()}`
    const certSerial = Date.now() * 100 + Number(process.env.JEST_WORKER_ID)

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [AuthUserinfoModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

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
        const result = await db.billing.Admin.insert({
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
            ssl_client_m_serial: certSerial,
        })
        adminId = result.identifiers[0].id
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
            it('read auth/userinfo', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/auth/userinfo')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.username).toEqual(creds.username)
                expect(response.body.role).toEqual('admin')
                expect(response.body.id).toEqual(adminId)
            })

            it('not expose the otp secret', async () => {
                await db.billing.Admin.update(adminId, {otp_secret: 'MOCKOTPSECRETE2E'})
                const response = await request(app.getHttpServer())
                    .get('/api/auth/userinfo')
                    .set('Authorization', 'Basic ' + Buffer.from(`${creds.username}:${creds.password}`).toString('base64'))
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body).not.toHaveProperty('otp_secret_key')
                expect(JSON.stringify(response.body)).not.toContain('MOCKOTPSECRETE2E')
            })

            it('reject the token of a deleted admin', async () => {
                const admin = await db.billing.Admin.findOneByOrFail({id: adminId})
                await db.billing.Admin.insert({...admin, id: undefined, login: goneLogin, otp_secret: null, ssl_client_m_serial: null})
                const jwt = await request(app.getHttpServer())
                    .post('/api/auth/jwt')
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({username: goneLogin, password: creds.password})
                expect(jwt.status).toEqual(201)
                await db.billing.Admin.delete({login: goneLogin})
                const response = await request(app.getHttpServer())
                    .get('/api/auth/userinfo')
                    .set('Authorization', 'Bearer ' + jwt.body['access_token'])
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(401)
            })

            it('read auth/userinfo with a client certificate serial', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/auth/userinfo')
                    .set('x-ssl-client-serial', certSerial.toString(16))
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.id).toEqual(adminId)
                expect(response.body.role).toEqual('admin')
            })

            it.each([
                ['an unknown', '1fffffffffffff'],
                ['an invalid', 'zz'],
            ])('reject %s client certificate serial', async (_name, serial) => {
                const response = await request(app.getHttpServer())
                    .get('/api/auth/userinfo')
                    .set('x-ssl-client-serial', serial)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(401)
            })

            it('reject the client certificate serial of an inactive admin', async () => {
                await db.billing.Admin.update(adminId, {is_active: false})
                const response = await request(app.getHttpServer())
                    .get('/api/auth/userinfo')
                    .set('x-ssl-client-serial', certSerial.toString(16))
                    .set('Accept', 'application/json')
                await db.billing.Admin.update(adminId, {is_active: true})
                expect(response.status).toEqual(403)
            })

            it('reject auth/userinfo without credentials', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/auth/userinfo')
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(401)
            })
        })
    })

    describe('Auth Userinfo DELETE', () => {
        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: goneLogin})
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})