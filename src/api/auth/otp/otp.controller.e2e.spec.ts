import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'
import {In} from 'typeorm'

import {AdminModule} from '~/api/admins/admin.module'
import {OtpModule} from '~/api/auth/otp/otp.module'
import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {ResponseValidationInterceptor} from '~/interceptors/validate.interceptor'
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
    const creds = {username: 'administrator', password: 'administrator'}
    const preferHeader: [string, string] = ['prefer', 'return=representation']
    const strongPassword = 'FFFooobarbaz123!!!' //  MT#60560

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [OtpModule, AdminModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        app = moduleRef.createNestApplication()

        // TODO import other app configuration from bootstrap()
        // like interceptors, etc.
        app.useGlobalPipes(new ValidateInputPipe())
        app.useGlobalFilters(new HttpExceptionFilter())
        app.useGlobalInterceptors(new ResponseValidationInterceptor())
        app.setGlobalPrefix('api')

        createdAdminIds = []

        await app.init()
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
                        login: 'adminmaster',
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
                        login: 'adminmaster2fa',
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
                        .set(...preferHeader)
                        .send(admins)
                    expect(response.status).toEqual(201)
                    for (const admin of response.body) {
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
                    .auth('adminmaster2fa', strongPassword)
                expect(response.status).toEqual(200)
                expect(response.body['otp_secret_key']).toBeDefined()
            })

            it('returns a qr code if qr=true', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/auth/otp?qr=true')
                    .auth('adminmaster2fa', strongPassword)
                expect(response.status).toEqual(200)
                expect(response.headers['content-type']).toEqual('image/png')
            })

            it('fails to read users otp_secret_key if 2fa is disabled', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/auth/otp')
                    .auth('adminmaster', strongPassword)
                expect(response.status).toEqual(422)
            })

        })
    })
    describe('Cleanup', () => {
        it('delete created admins bulk', async () => {
            const result = await request(app.getHttpServer())
                .delete('/api/admins/')
                .set(...authHeader)
                .send(createdAdminIds)
            expect(result.status).toEqual(200)
        })
    })
})