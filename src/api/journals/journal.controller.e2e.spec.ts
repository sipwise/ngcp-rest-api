import {deflateSync} from 'zlib'

import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {In, Like, MoreThanOrEqual} from 'typeorm'
import {v4 as uuidv4} from 'uuid'

import {JournalResponseDto} from './dto/journal-response.dto'
import {JournalModule} from './journal.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {VoipSubscriber as BillingVoipSubscriber} from '~/entities/db/billing/voip-subscriber.mariadb.entity'
import {ContactStatus} from '~/entities/internal/contact.internal.entity'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

describe('Journal', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let contractId: number
    let phonebookId: number
    let contactId: number
    let journalIds: number[] = []
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const resellerCreds = {username: `mockResellerUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const reseller1Creds = {username: `mockReseller1User${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const nonMasterCreds = {username: `mockNonMasterUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const suffix = `${process.env.JEST_WORKER_ID}x${Date.now()}`
    let otherResellerContractId: number
    let otherResellerId: number
    let otherResellerJournalId: number
    let resellerHeader: [string, string]
    const fixtureJournalIds: number[] = []
    const subscriberDomain = `journal-${suffix}.test`
    const subadminUsername = `journal_subadmin_${suffix}`
    const subscriberUsername = `journal_sub_${suffix}`
    let subscriberBillingDomainId: number
    let subscriberProvisioningDomainId: number
    const subscriberProvisioningIds: number[] = []
    const startedAt = Date.now() / 1000

    const get = (url: string): request.Test => request(app.getHttpServer())
        .get(url)
        .set(...authHeader)
        .set('Accept', 'application/json')

    const getAs = (header: [string, string], url: string): request.Test => request(app.getHttpServer())
        .get(url)
        .set(...header)
        .set('Accept', 'application/json')

    const login = async (loginCreds: {username: string, password: string}): Promise<[string, string]> => {
        const response = await request(app.getHttpServer())
            .post('/api/auth/jwt')
            .set('Accept', 'application/json')
            .set('Content-Type', 'application/json')
            .send(loginCreds)
        expect(response.status).toEqual(201)
        return ['Authorization', 'Bearer ' + response.body['access_token']]
    }

    const insertAdmin = async (login: string, role: RbacRole, resellerId: number, isMaster: boolean): Promise<number> => {
        await db.billing.Admin.delete({login: login})
        const aclRole = await db.billing.AclRole.findOneByOrFail({role: role})
        return (await db.billing.Admin.insert({
            reseller_id: resellerId,
            login: login,
            saltedpass: 'mockAdminSaltedpass',
            saltedpass_modify_timestamp: new Date(),
            role_id: aclRole.id,
            is_master: isMaster,
            is_superuser: role == RbacRole.admin,
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
        })).identifiers[0].id as number
    }

    const insertJournal = async (resourceName: string, resourceId: number, role: RbacRole, resellerId: number,
        content: string | Buffer = '{}', contentFormat = 'json'): Promise<number> => {
        const aclRole = await db.billing.AclRole.findOneByOrFail({role: role})
        const id = (await db.billing.Journal.insert({
            operation: 'update',
            resource_name: resourceName,
            resource_id: resourceId,
            timestamp: Date.now() / 1000,
            username: creds.username,
            content_format: contentFormat,
            content: content,
            role_id: aclRole.id,
            reseller_id: resellerId,
        })).identifiers[0].id as number
        fixtureJournalIds.push(id)
        return id
    }

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [JournalModule, AppModule],
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
        describe('write', () => {
            it('create a customer phonebook entry', async () => {
                const contract = await db.billing.Contract.create({contact_id: 1, product_id: 4}).save()
                contractId = contract.id
                const response = await request(app.getHttpServer())
                    .post('/api/customers/phonebook')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({customer_id: contractId, name: 'journal_phonebook', number: '4711'})
                expect(response.status).toEqual(201)
                phonebookId = +response.body.data[0].id
            })
            it('update the customer phonebook entry', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/customers/phonebook/${phonebookId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({customer_id: contractId, name: 'journal_phonebook', number: '4712'})
                expect(response.status).toEqual(204)
            })
            it('update the customer phonebook entry by the path with the customer id', async () => {
                const patch: PatchOperation[] = [{op: 'replace', path: '/number', value: '4713'}]
                const response = await request(app.getHttpServer())
                    .patch(`/api/customers/${contractId}/phonebook/${phonebookId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(204)
            })
            it('create a system contact', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/systemcontacts')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({email: 'journal_sc@example.com', status: ContactStatus.Active})
                expect(response.status).toEqual(201)
                contactId = +response.body.data[0].id
            })
            it('update the system contact', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/systemcontacts/${contactId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({email: 'journal_sc@example.com', firstname: 'journal', status: ContactStatus.Active})
                expect(response.status).toEqual(204)
            })
        })

        describe('resource names', () => {
            it('journals a nested resource by its path without parameters', async () => {
                // PUT and PATCH use the paths without and with the customer id
                const journals = await db.billing.Journal.find({
                    where: {resource_id: phonebookId, content: Like('%journal_phonebook%'), timestamp: MoreThanOrEqual(startedAt)},
                    order: {id: 'ASC'},
                })
                expect(journals.map(j => [j.resource_name, j.operation])).toEqual([
                    ['customers/phonebook', 'create'],
                    ['customers/phonebook', 'update'],
                    ['customers/phonebook', 'update'],
                ])
                journalIds = journals.map(j => j.id)
            })
            it('journals a top level resource by its name', async () => {
                const journals = await db.billing.Journal.find({
                    where: {resource_id: contactId, content: Like('%journal_sc@example.com%'), timestamp: MoreThanOrEqual(startedAt)},
                    order: {id: 'ASC'},
                })
                expect(journals.map(j => [j.resource_name, j.operation])).toEqual([
                    ['systemcontacts', 'create'],
                    ['systemcontacts', 'update'],
                ])
            })
        })

        describe('GET /journals', () => {
            it('search by resource_name and resource_id', async () => {
                const response = await get(`/api/journals?resource_name=customers/phonebook&resource_id=${phonebookId}`)
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(3)
                expect(response.body.data.map((j: JournalResponseDto) => j.id)).toEqual(expect.arrayContaining(journalIds))
            })
            it('read by nested resource name and id', async () => {
                const response = await get(`/api/journals/customers/phonebook/${phonebookId}`)
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(3)
                const journals: JournalResponseDto[] = response.body.data
                expect(journals.every(j => j.resource_name == 'customers/phonebook' && j.resource_id == phonebookId)).toBe(true)
            })
            it('read by nested resource name and id with encoded slashes', async () => {
                const response = await get(`/api/journals/${encodeURIComponent(`customers/phonebook/${phonebookId}`)}`)
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(3)
            })
            it('read by nested resource name', async () => {
                const response = await get(`/api/journals/customers/phonebook?resource_id=${phonebookId}`)
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(3)
            })
            it('read by top level resource name and id', async () => {
                const response = await get(`/api/journals/systemcontacts/${contactId}`)
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(2)
                expect(response.body.data.map((j: JournalResponseDto) => j.operation).sort()).toEqual(['create', 'update'])
            })
            it('read by journal id', async () => {
                const response = await get(`/api/journals/${journalIds[0]}`)
                expect(response.status).toEqual(200)
                expect(response.body.data.map((j: JournalResponseDto) => j.id)).toContain(journalIds[0])
            })
            it('search by role', async () => {
                const resourceName = `e2ejournalrole${suffix}`
                const adminJournalId = await insertJournal(resourceName, 1, RbacRole.admin, 1)
                const resellerJournalId = await insertJournal(resourceName, 1, RbacRole.reseller, 1)
                const admin = await get(`/api/journals?resource_name=${resourceName}&role=admin`)
                expect(admin.status).toEqual(200)
                expect(admin.body.data.map((j: JournalResponseDto) => j.id)).toEqual([adminJournalId])
                const reseller = await get(`/api/journals?resource_name=${resourceName}&role=reseller`)
                expect(reseller.status).toEqual(200)
                expect(reseller.body.data.map((j: JournalResponseDto) => j.id)).toEqual([resellerJournalId])
            })
            it('read nothing for an unknown resource', async () => {
                const response = await get(`/api/journals/customers/foo/${phonebookId}`)
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(0)
            })
        })

        describe('reseller scope', () => {
            const resourceName = `e2ejournalscope${suffix}`

            it('create another reseller and log in as its reseller admin', async () => {
                const now = new Date()
                otherResellerContractId = (await db.billing.Contract.create({
                    contact_id: 2, product_id: 3, status: ContractStatus.Active, create_timestamp: now, modify_timestamp: now,
                }).save()).id
                otherResellerId = (await db.billing.Reseller.create({
                    contract_id: otherResellerContractId, name: `journal_reseller_${suffix}`, status: ResellerStatus.Active,
                }).save()).id
                await db.billing.Admin.delete({login: resellerCreds.username})
                const resellerRole = await db.billing.AclRole.findOneByOrFail({role: RbacRole.reseller})
                await db.billing.Admin.insert({
                    reseller_id: otherResellerId,
                    login: resellerCreds.username,
                    saltedpass: 'mockAdminSaltedpass',
                    saltedpass_modify_timestamp: now,
                    role_id: resellerRole.id,
                    is_master: true,
                    is_superuser: false,
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
                otherResellerJournalId = (await db.billing.Journal.insert({
                    operation: 'create',
                    resource_name: resourceName,
                    resource_id: 1,
                    timestamp: now.getTime() / 1000,
                    username: creds.username,
                    content_format: 'json',
                    content: '{}',
                    role_id: resellerRole.id,
                    reseller_id: 1,
                })).identifiers[0].id
                const response = await request(app.getHttpServer())
                    .post('/api/auth/jwt')
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(resellerCreds)
                expect(response.status).toEqual(201)
                resellerHeader = ['Authorization', 'Bearer ' + response.body['access_token']]
            })

            it('read journals of another reseller by resource name as admin', async () => {
                const response = await get(`/api/journals/${resourceName}`)
                expect(response.status).toEqual(200)
                expect(response.body.data.map((j: JournalResponseDto) => j.id)).toEqual([otherResellerJournalId])
            })

            it('not read journals of another reseller by resource name', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/journals/${resourceName}`)
                    .set(...resellerHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(0)
            })
        })

        describe('GET /<resource>/{id}/journal', () => {
            it('read the journal of a nested resource', async () => {
                for (const url of [
                    `/api/customers/phonebook/${phonebookId}/journal`,
                    `/api/customers/${contractId}/phonebook/${phonebookId}/journal`,
                ]) {
                    const response = await get(url)
                    expect(response.status).toEqual(200)
                    expect(response.body.total_count).toEqual(3)
                    expect(response.body.data.map((j: JournalResponseDto) => j.id)).toEqual(expect.arrayContaining(journalIds))
                }
            })
            it('read the journal of a top level resource', async () => {
                const response = await get(`/api/systemcontacts/${contactId}/journal`)
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(2)
            })
            it.each([
                '/api/customers/999999999/journal',
                '/api/customers/balances/999999999/journal',
                '/api/resellers/phonebook/999999999/journal',
                '/api/subscribers/phonebook/999999999/journal',
                '/api/ncos/sets/levels/999999999/journal',
                '/api/header-manipulations/sets/999999999/journal',
                '/api/header-manipulations/sets/rules/999999999/journal',
                '/api/header-manipulations/sets/rules/actions/999999999/journal',
                '/api/header-manipulations/sets/rules/conditions/999999999/journal',
                '/api/peerings/groups/999999999/journal',
                '/api/peerings/groups/rules/999999999/journal',
                '/api/peerings/groups/inbound-rules/999999999/journal',
                '/api/peerings/groups/servers/999999999/journal',
                '/api/rewrite-rules/sets/999999999/journal',
                '/api/rewrite-rules/sets/rules/999999999/journal',
            ])('read the empty journal of the missing resource %s', async url => {
                const response = await get(url)
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(0)
            })
            it('not read fileshare journals (uuid ids are not journaled by id)', async () => {
                const response = await get('/api/fileshare/0/journal')
                expect(response.status).toEqual(404)
            })
        })

        describe('cross reseller writers', () => {
            let ccareadminJournalId: number
            let reseller1Header: [string, string]

            it('journal a ccareadmin of the other reseller updating a phonebook entry of reseller 1', async () => {
                // ccareadmin is not bound to a reseller, v2 stamps the writer's reseller
                ccareadminJournalId = await insertJournal('customers/phonebook', phonebookId, RbacRole.ccareadmin, otherResellerId)
                await insertAdmin(reseller1Creds.username, RbacRole.reseller, 1, true)
                reseller1Header = await login(reseller1Creds)
            })
            it('not read it by the resource as the other reseller', async () => {
                const response = await getAs(resellerHeader, `/api/journals/customers/phonebook/${phonebookId}`)
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(0)
            })
            it('not read it in the collection as the other reseller', async () => {
                const response = await getAs(resellerHeader, `/api/journals?resource_name=customers/phonebook&resource_id=${phonebookId}`)
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(0)
            })
            it.each([
                (): string => `/api/customers/phonebook/${phonebookId}/journal`,
                (): string => `/api/customers/${contractId}/phonebook/${phonebookId}/journal`,
            ])('not read the journal of the entry as the other reseller (%#)', async url => {
                const response = await getAs(resellerHeader, url())
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(0)
            })
            it('read only the entries of accessible roles on the journal of the entry as the owner reseller', async () => {
                const response = await getAs(reseller1Header, `/api/customers/phonebook/${phonebookId}/journal`)
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(1)
                expect(response.body.data.map((j: JournalResponseDto) => j.id)).toEqual([ccareadminJournalId])
            })
        })

        describe('admins', () => {
            let adminId: number
            let nonMasterId: number
            let nonMasterHeader: [string, string]
            const resourceIds = (body: {data: JournalResponseDto[]}): number[] => body.data.map(j => j.resource_id).sort()

            it('journal the master and a non-master admin', async () => {
                adminId = (await db.billing.Admin.findOneByOrFail({login: creds.username})).id
                nonMasterId = await insertAdmin(nonMasterCreds.username, RbacRole.admin, 1, false)
                await insertJournal('admins', adminId, RbacRole.admin, 1)
                await insertJournal('admins', nonMasterId, RbacRole.admin, 1)
                nonMasterHeader = await login(nonMasterCreds)
            })
            it('read the journals of all admins as master', async () => {
                const response = await get(`/api/journals?resource_name=admins&resource_id=${adminId},${nonMasterId}`)
                expect(response.status).toEqual(200)
                expect(resourceIds(response.body)).toEqual([adminId, nonMasterId].sort())
            })
            it('read only the own journals as non-master', async () => {
                const response = await getAs(nonMasterHeader, `/api/journals?resource_name=admins&resource_id=${adminId},${nonMasterId}`)
                expect(response.status).toEqual(200)
                expect(resourceIds(response.body)).toEqual([nonMasterId])
            })
            it('read the own journal as non-master', async () => {
                const response = await getAs(nonMasterHeader, `/api/admins/${nonMasterId}/journal`)
                expect(response.status).toEqual(200)
                expect(resourceIds(response.body)).toEqual([nonMasterId])
            })
            it('not read the journal of another admin as non-master', async () => {
                const response = await getAs(nonMasterHeader, `/api/admins/${adminId}/journal`)
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(0)
            })
        })

        describe('subscriber roles', () => {
            const asSubscriber = (username: string, url: string): request.Test => request(app.getHttpServer())
                .get(url)
                .auth(`${username}@${subscriberDomain}`, 'mockSubscriberWebpassword')
                .set('X-Auth-Realm', 'subscriber')
                .set('Accept', 'application/json')

            it('create a subscriberadmin and a subscriber of the phonebook customer', async () => {
                subscriberBillingDomainId = (await db.billing.Domain.create({domain: subscriberDomain, reseller_id: 1}).save()).id
                subscriberProvisioningDomainId = (await db.provisioning.VoipDomain.create({domain: subscriberDomain}).save()).id
                for (const [username, isAdmin] of [[subadminUsername, true], [subscriberUsername, false]] as [string, boolean][]) {
                    const uuid = uuidv4()
                    await BillingVoipSubscriber.insert({ // insert instead of create to avoid a cyclic dependency error
                        contract_id: contractId,
                        uuid: uuid,
                        username: username,
                        domain_id: subscriberBillingDomainId,
                        status: 'active',
                    })
                    subscriberProvisioningIds.push((await db.provisioning.VoipSubscriber.insert({
                        username: username,
                        domain_id: subscriberProvisioningDomainId,
                        uuid: uuid,
                        password: uuidv4().slice(0, 16),
                        webusername: username,
                        webpassword: 'mockSubscriberWebpassword',
                        webpassword_modify_timestamp: new Date(),
                        admin: isAdmin,
                        account_id: contractId,
                    })).identifiers[0].id)
                }
            })
            it.each([
                ['subscriberadmin', (): string => `/api/customers/phonebook/${phonebookId}/journal`],
                ['subscriberadmin', (): string => `/api/customers/${contractId}/phonebook/${phonebookId}/journal`],
                ['subscriberadmin', (): string => '/api/customerspeeddials/1/journal'],
                ['subscriberadmin', (): string => '/api/subscribers/phonebook/1/journal'],
                ['subscriber', (): string => '/api/subscribers/phonebook/1/journal'],
            ])('reject the %s on %s', async (role, url) => {
                const response = await asSubscriber(role == 'subscriber' ? subscriberUsername : subadminUsername, url())
                expect(response.status).toEqual(403)
            })
        })

        describe('content', () => {
            const resourceName = `e2ejournalsecret${suffix}`
            const masked = '********'
            const secrets = {name: 'n', password: 'clear', nested: {webpassword: 'clear', otp_secret_key: 'clear', otp_secret: 'clear'}}
            let jsonId: number
            let deflateId: number
            let storableId: number

            it('journal secrets in json, json_deflate and storable content', async () => {
                jsonId = await insertJournal(resourceName, 1, RbacRole.admin, 1, JSON.stringify(secrets))
                deflateId = await insertJournal(resourceName, 2, RbacRole.admin, 1, deflateSync(JSON.stringify(secrets)), 'json_deflate')
                storableId = await insertJournal(resourceName, 3, RbacRole.admin, 1, Buffer.from('pst0\x04\x0b\x03'), 'storable')
            })
            it('read the content with the secrets masked', async () => {
                const response = await get(`/api/journals/${resourceName}`)
                expect(response.status).toEqual(200)
                const content = Object.fromEntries(response.body.data.map((j: JournalResponseDto) => [j.id, j.content]))
                const expected = {name: 'n', password: masked, nested: {webpassword: masked, otp_secret_key: masked, otp_secret: masked}}
                expect(content[jsonId]).toEqual(expected)
                expect(content[deflateId]).toEqual(expected)
                expect(content[storableId]).toBeNull()
            })
        })
    })

    describe('Journal DELETE', () => {
        it('delete created journals', async () => {
            await db.billing.Journal.delete({username: creds.username, timestamp: MoreThanOrEqual(startedAt)})
        })

        it('delete created fixtures', async () => {
            if (otherResellerJournalId)
                await db.billing.Journal.delete(otherResellerJournalId)
            if (fixtureJournalIds.length)
                await db.billing.Journal.delete(fixtureJournalIds)
            if (subscriberProvisioningIds.length)
                await db.provisioning.VoipSubscriber.delete(subscriberProvisioningIds)
            if (contractId)
                await BillingVoipSubscriber.delete({contract_id: contractId, username: In([subadminUsername, subscriberUsername])})
            if (subscriberBillingDomainId)
                await db.billing.Domain.delete(subscriberBillingDomainId)
            if (subscriberProvisioningDomainId)
                await db.provisioning.VoipDomain.delete(subscriberProvisioningDomainId)
            if (otherResellerId)
                await db.billing.Reseller.delete(otherResellerId)
            if (otherResellerContractId)
                await db.billing.Contract.delete(otherResellerContractId)
            if (phonebookId)
                await db.billing.ContractPhonebook.delete(phonebookId)
            if (contactId)
                await db.billing.Contact.delete(contactId)
            if (contractId)
                await db.billing.Contract.delete(contractId)
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
            await db.billing.Admin.delete({login: resellerCreds.username})
            await db.billing.Admin.delete({login: reseller1Creds.username})
            await db.billing.Admin.delete({login: nonMasterCreds.username})
        })
    })
})
