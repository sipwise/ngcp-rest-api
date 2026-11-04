import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'

import {PbxResponseDto} from './dto/pbx-response.dto'
import {PbxModule} from './pbx.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {License as LicenseType, RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {validate} from '~/helpers/validate.helper'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'
import {LicenseMockRepository} from '~/repositories/license.mock.repository'
import {LicenseRepository} from '~/repositories/license.repository'

describe('', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    const licenseMockRepo = new LicenseMockRepository()
    let authHeader: [string, string]
    const creds = {username: 'mockAdminUser', password: 'mockAdminPass'}

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [PbxModule, AppModule],
        })
            .overrideProvider(LicenseRepository).useValue(licenseMockRepo)
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
    })

    afterEach(async () => {
        licenseMockRepo.reset()
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
            it('read pbx if pbx license is active', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/pbx')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
            })
            it('does not read pbx if pbx license is inactive', async () => {
                licenseMockRepo.setLicense(LicenseType.pbx, 0)
                const response = await request(app.getHttpServer())
                    .get('/api/pbx')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(403)
            })
            it('read pbx', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/pbx')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const setCollection: PbxResponseDto = response.body
                expect(await validate(setCollection)).toEqual([])
            })
        })
    })

    describe('PBX DELETE', () => {
        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})