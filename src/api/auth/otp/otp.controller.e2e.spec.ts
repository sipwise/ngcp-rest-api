import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {In} from 'typeorm'

import {AdminModule} from '~/api/admins/admin.module'
import {AuthOtpModule} from '~/api/auth/otp/otp.module'
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

type AdminPost = {
    email: string
    reseller_id: number
    login: string
    is_master: boolean
    is_active: boolean
    read_only: boolean
    show_passwords: boolean
    call_data: boolean
    billing_data: boolean
    can_reset_password: boolean
    password: string
    role: RbacRole
    enable_2fa: boolean
    otp_init?: boolean
    otp_secret_key?: string
}


describe('OTP', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let createdAdminIds: number[]
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const run = Date.now().toString(36)
    const masterLogin = `adminmaster_${run}`
    const master2faLogin = `adminmaster2fa_${run}`
    const strongPassword = 'FFFooobarbaz123!!!' //  MT#60560

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [AuthOtpModule, AdminModule, AppModule],
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

        createdAdminIds = []

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
        describe('Create initial users', () => {
            describe('Create initial admins', () => {
                const admins: AdminPost[] = [
                    {
                        billing_data: true,
                        call_data: false,
                        can_reset_password: true,
                        is_active: true,
                        is_master: true,
                        email: 'adminmasterNo2Fa@example.com',
                        login: masterLogin,
                        password: strongPassword,
                        read_only: false,
                        reseller_id: 1,
                        role: RbacRole.admin,
                        show_passwords: true,
                        enable_2fa:false,
                    },
                    {
                        billing_data: true,
                        call_data: false,
                        can_reset_password: true,
                        is_active: true,
                        is_master: true,
                        email: 'adminmasterYes2Fa@example.com',
                        login: master2faLogin,
                        password: strongPassword,
                        read_only: false,
                        reseller_id: 1,
                        role: RbacRole.admin,
                        show_passwords: true,
                        enable_2fa:true,
                    },
                ]
                it('should create admins with and without 2fa', async () => {
                    expect.assertions(1)
                    const response = await request(app.getHttpServer())
                        .post('/api/admins')
                        .set(...authHeader)
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .set('Prefer', 'return=representation')
                        .send(admins)
                    expect(response.status).toEqual(201)
                    for (const admin of response.body.data) {
                        createdAdminIds.push(+admin.id)
                    }
                })

                it('created users as expected', async () => {
                    const admins = await db.billing.Admin.find({
                        where: {
                            id: In(createdAdminIds),
                        },
                    },
                    )
                    expect(admins.length).toEqual(createdAdminIds.length)
                    for (const admin of admins) {
                        expect(createdAdminIds).toContain(admin.id)
                        if(admin.enable_2fa){
                            expect(admin.otp_secret).toBeDefined()
                            expect(admin.show_otp_registration_info).toBe(true)
                        }
                    }
                })
            })
        })

        describe('GET', () => {
            it('read users otp_secret_key if 2fa is enabled', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/auth/otp')
                    .auth(master2faLogin, strongPassword)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body['otp_secret_key']).toBeDefined()
            })

            it('returns a qr code if qr=true', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/auth/otp?qr=true')
                    .auth(master2faLogin, strongPassword)
                    .set('Accept', 'image/png')
                expect(response.status).toEqual(200)
                expect(response.headers['content-type']).toEqual('image/png')
            })

            it('fails to read users otp_secret_key if 2fa is disabled', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/auth/otp')
                    .auth(masterLogin, strongPassword)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(422)
            })

        })
    })
    describe('OTP DELETE', () => {
        it('delete created admins bulk', async () => {
            const result = await request(app.getHttpServer())
                .delete('/api/admins/')
                .set(...authHeader)
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send(createdAdminIds)
            expect(result.status).toEqual(204)
        })
        it('delete created journals', async () => {
            if (createdAdminIds.length)
                await db.billing.Journal.delete({resource_name: 'admins', resource_id: In(createdAdminIds)})
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})
