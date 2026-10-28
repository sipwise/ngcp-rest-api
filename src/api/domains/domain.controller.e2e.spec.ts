import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'

import {DomainModule} from './domain.module'
import {DomainResponseDto} from './dto/domain-response.dto'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

describe('Domain', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let resellerAdminId: number
    const createdIds: number[] = []
    const creds = {username: 'administrator', password: 'administrator'}
    const resellerCreds = {username: 'domain_reseller', password: 'FFFooobarbaz123!!!'}
    const domainSuffix = `${Date.now()}.e2e.example.org`

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [DomainModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        app = moduleRef.createNestApplication()

        app.useGlobalPipes(new ValidateInputPipe())
        app.useGlobalFilters(new HttpExceptionFilter())
        app.useGlobalInterceptors(new ResponseValidationInterceptor())

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
            .post('/auth/jwt')
            .send(creds)
        expect(response.status).toEqual(201)
        expect(response.body['access_token']).toBeDefined()
        authHeader = ['Authorization', 'Bearer ' + response.body['access_token']]
    })

    describe('', () => { // main tests block
        describe('POST', () => {
            it('create domain', async () => {
                const response = await request(app.getHttpServer())
                    .post('/domains')
                    .set(...authHeader)
                    .send({domain: `admin.${domainSuffix}`, reseller_id: 1})
                expect(response.status).toEqual(201)
                createdIds.push(+response.body[0].id)
            })
            it('fail create domain without reseller_id', async () => {
                const tt = [
                    {domain: `admin-none.${domainSuffix}`},
                    {domain: `admin-none.${domainSuffix}`, reseller_id: null},
                ]
                for (const domain of tt) {
                    const response = await request(app.getHttpServer())
                        .post('/domains')
                        .set(...authHeader)
                        .send(domain)
                    expect(response.status).toEqual(422)
                    expect(JSON.stringify(response.body.message)).toContain('reseller_id should not be empty')
                }
            })
            it('fail create domain with invalid reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/domains')
                    .set(...authHeader)
                    .send({domain: `admin-invalid.${domainSuffix}`, reseller_id: 999911111})
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read created domain', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/domains/${createdIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const domain: DomainResponseDto = response.body
                expect(domain.domain).toEqual(`admin.${domainSuffix}`)
                expect(domain.reseller_id).toEqual(1)
            })
            it('read non-existing domain', async () => {
                const response = await request(app.getHttpServer())
                    .get('/domains/999911111122')
                    .set(...authHeader)
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('Domain as reseller', () => {
        let resellerDomainId: number
        it('create reseller admin', async () => {
            const response = await request(app.getHttpServer())
                .post('/admins')
                .set(...authHeader)
                .send({
                    billing_data: true,
                    call_data: false,
                    can_reset_password: true,
                    is_active: true,
                    is_master: true,
                    email: `${resellerCreds.username}@example.com`,
                    login: resellerCreds.username,
                    password: resellerCreds.password,
                    read_only: false,
                    reseller_id: 1,
                    role: RbacRole.reseller,
                    show_passwords: true,
                    enable_2fa: false,
                })
            expect(response.status).toEqual(201)
            resellerAdminId = +response.body[0].id
        })
        it('fail create domain with reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .post('/domains')
                .auth(resellerCreds.username, resellerCreds.password)
                .send({domain: `reseller.${domainSuffix}`, reseller_id: 1})
            expect(response.status).toEqual(422)
            expect(JSON.stringify(response.body.message)).toContain('property reseller_id should not exist')
        })
        it('create domain without reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .post('/domains')
                .auth(resellerCreds.username, resellerCreds.password)
                .send({domain: `reseller.${domainSuffix}`})
            expect(response.status).toEqual(201)
            expect(response.body[0].reseller_id).toEqual(1)
            resellerDomainId = +response.body[0].id
            createdIds.push(resellerDomainId)
        })
        it('read domain created by reseller', async () => {
            const response = await request(app.getHttpServer())
                .get(`/domains/${resellerDomainId}`)
                .set(...authHeader)
            expect(response.status).toEqual(200)
            expect(response.body.reseller_id).toEqual(1)
        })
        it('delete reseller admin', async () => {
            const response = await request(app.getHttpServer())
                .delete(`/admins/${resellerAdminId}`)
                .set(...authHeader)
            expect(response.status).toEqual(200)
        })
    })

    describe('Domain DELETE', () => {
        it('delete created domains', async () => {
            for (const id of createdIds) {
                const response = await request(app.getHttpServer())
                    .delete(`/domains/${id}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
            }
        })
    })
})
