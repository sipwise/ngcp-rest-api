import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {In, MoreThanOrEqual} from 'typeorm'

import {DomainModule} from './domain.module'
import {DomainResponseDto} from './dto/domain-response.dto'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

describe('Domain', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let resellerAdminId: number
    const createdIds: number[] = []
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const startedAt = Date.now() / 1000
    const resellerCreds = {username: `domain_reseller_${Date.now().toString(36)}`, password: 'FFFooobarbaz123!!!'}
    const domainSuffix = `${Date.now()}.e2e.example.org`
    const scopeLogins = {
        [RbacRole.reseller]: `mockResellerUser${process.env.JEST_WORKER_ID}`,
        [RbacRole.ccare]: `mockCcareUser${process.env.JEST_WORKER_ID}`,
        [RbacRole.ccareadmin]: `mockCcareadminUser${process.env.JEST_WORKER_ID}`,
    }
    let otherResellerContractId: number
    let otherResellerId: number

    const insertAdmin = async (login: string, role: RbacRole, resellerId: number): Promise<void> => {
        await db.billing.Admin.delete({login: login})
        const aclRole = await db.billing.AclRole.findOneByOrFail({role: role})
        await db.billing.Admin.insert({
            reseller_id: resellerId,
            login: login,
            saltedpass: 'mockAdminSaltedpass',
            saltedpass_modify_timestamp: new Date(),
            role_id: aclRole.id,
            is_master: true,
            is_superuser: false,
            is_system: false,
            is_ccare: role == RbacRole.ccare || role == RbacRole.ccareadmin,
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
    }

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [DomainModule, AppModule],
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
        describe('POST', () => {
            it('create domain', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/domains')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({domain: `admin.${domainSuffix}`, reseller_id: 1})
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.data[0].id)
            })
            it('fail create domain without reseller_id', async () => {
                const tt = [
                    {domain: `admin-none.${domainSuffix}`},
                    {domain: `admin-none.${domainSuffix}`, reseller_id: null},
                ]
                for (const domain of tt) {
                    const response = await request(app.getHttpServer())
                        .post('/api/domains')
                        .set(...authHeader)
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send(domain)
                    expect(response.status).toEqual(422)
                    expect(JSON.stringify(response.body.message)).toContain('reseller_id should not be empty')
                }
            })
            it('fail create domain with invalid reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/domains')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({domain: `admin-invalid.${domainSuffix}`, reseller_id: 999911111})
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read created domain', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/domains/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const domain: DomainResponseDto = response.body
                expect(domain.domain).toEqual(`admin.${domainSuffix}`)
                expect(domain.reseller_id).toEqual(1)
            })
            it('read domains list filtered by name', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/domains?domain=admin.${domainSuffix}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(1)
                const domains: DomainResponseDto[] = response.body.data
                expect(domains.map(d => +d.id)).toEqual([createdIds[0]])
                expect(domains[0].domain).toEqual(`admin.${domainSuffix}`)
            })
            it('read non-existing domain', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/domains/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })
        })

        describe('as reseller', () => {
            let resellerDomainId: number
            it('create reseller admin', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/admins')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
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
                resellerAdminId = +response.body.data[0].id
            })
            it('fail create domain with reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/domains')
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({domain: `reseller.${domainSuffix}`, reseller_id: 1})
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.message)).toContain('property reseller_id should not exist')
            })
            it('create domain without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/domains')
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({domain: `reseller.${domainSuffix}`})
                expect(response.status).toEqual(201)
                expect(response.body.data[0].reseller_id).toEqual(1)
                resellerDomainId = +response.body.data[0].id
                createdIds.push(resellerDomainId)
            })
            it('read domain created by reseller', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/domains/${resellerDomainId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.reseller_id).toEqual(1)
            })
        })

        describe('reseller scope', () => {
            const headers: {[role: string]: [string, string]} = {}
            let otherDomainId: number

            const get = (role: string, url: string): request.Test => request(app.getHttpServer())
                .get(url)
                .set(...headers[role])
                .set('Accept', 'application/json')

            it('create another reseller with a domain and log in as its admins', async () => {
                const now = new Date()
                otherResellerContractId = (await db.billing.Contract.create({
                    contact_id: 2, product_id: 3, status: ContractStatus.Active, create_timestamp: now, modify_timestamp: now,
                }).save()).id
                otherResellerId = (await db.billing.Reseller.create({
                    contract_id: otherResellerContractId,
                    name: `domain_reseller_${process.env.JEST_WORKER_ID}_${Date.now()}`,
                    status: ResellerStatus.Active,
                }).save()).id
                const response = await request(app.getHttpServer())
                    .post('/api/domains')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({domain: `other.${domainSuffix}`, reseller_id: otherResellerId})
                expect(response.status).toEqual(201)
                otherDomainId = +response.body.data[0].id
                createdIds.push(otherDomainId)
                for (const [role, login] of Object.entries(scopeLogins)) {
                    await insertAdmin(login, role as RbacRole, otherResellerId)
                    const auth = await request(app.getHttpServer())
                        .post('/api/auth/jwt')
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send({username: login, password: 'mockAdminPass'})
                    expect(auth.status).toEqual(201)
                    headers[role] = ['Authorization', 'Bearer ' + auth.body['access_token']]
                }
            })

            it.each([RbacRole.reseller, RbacRole.ccare])('list only own domains as %s', async role => {
                const response = await get(role, `/api/domains?domain=*.${domainSuffix}`)
                expect(response.status).toEqual(200)
                expect(response.body.data.map((d: DomainResponseDto) => +d.id)).toEqual([otherDomainId])
            })

            it.each([RbacRole.reseller, RbacRole.ccare])('read own domain as %s', async role => {
                const response = await get(role, `/api/domains/${otherDomainId}`)
                expect(response.status).toEqual(200)
                expect(response.body.reseller_id).toEqual(otherResellerId)
            })

            it.each([RbacRole.reseller, RbacRole.ccare])('not read a domain of another reseller as %s', async role => {
                const response = await get(role, `/api/domains/${createdIds[0]}`)
                expect(response.status).toEqual(404)
            })

            it('list and read domains of all resellers as ccareadmin', async () => {
                const list = await get(RbacRole.ccareadmin, `/api/domains?domain=*.${domainSuffix}`)
                expect(list.status).toEqual(200)
                expect(list.body.data.map((d: DomainResponseDto) => +d.id)).toEqual(expect.arrayContaining(createdIds))
                const response = await get(RbacRole.ccareadmin, `/api/domains/${createdIds[0]}`)
                expect(response.status).toEqual(200)
                expect(response.body.reseller_id).toEqual(1)
            })

            it('not delete a domain of another reseller', async () => {
                const response = await request(app.getHttpServer())
                    .delete(`/api/domains/${createdIds[0]}`)
                    .set(...headers[RbacRole.reseller])
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                expect(response.status).toEqual(422)
                expect(await db.billing.Domain.findOneBy({id: createdIds[0]})).not.toBeNull()
            })
        })
    })

    describe('Domain DELETE', () => {
        it('delete created domains', async () => {
            for (const id of createdIds) {
                const response = await request(app.getHttpServer())
                    .delete(`/api/domains/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(204)
            }
        })
        it('delete reseller admin', async () => {
            if (!resellerAdminId)
                return
            const response = await request(app.getHttpServer())
                .delete(`/api/admins/${resellerAdminId}`)
                .set(...authHeader)
                .set('Accept', 'application/json')
            expect(response.status).toEqual(204)
        })
        it('delete created journals', async () => {
            if (createdIds.length)
                await db.billing.Journal.delete({
                    resource_name: 'domains',
                    resource_id: In(createdIds),
                    timestamp: MoreThanOrEqual(startedAt),
                })
            if (resellerAdminId)
                await db.billing.Journal.delete({resource_name: 'admins', resource_id: resellerAdminId})
        })

        it('delete created fixtures', async () => {
            if (otherResellerId)
                await db.billing.Reseller.delete(otherResellerId)
            if (otherResellerContractId)
                await db.billing.Contract.delete(otherResellerContractId)
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
            await db.billing.Admin.delete({login: In(Object.values(scopeLogins))})
        })
    })
})
