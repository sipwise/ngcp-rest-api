import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {In, MoreThanOrEqual} from 'typeorm'
import {v4 as uuidv4} from 'uuid'

import {SubscriberPhonebookResponseDto} from './dto/phonebook-response.dto'
import {SubscriberPhonebookModule} from './phonebook.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {VoipSubscriber as BillingVoipSubscriber} from '~/entities/db/billing/voip-subscriber.mariadb.entity'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'


type PhonebookPost = {
    name: string
    number: string
    subscriber_id: number
    shared: boolean
}

describe('Subscriber Phonebook', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    const createdPhonebookIds: number[] = []
    const createdSubscriberIds: number[] = []
    const createdContractIds: number[] = []
    const createdDomainIds: number[] = []
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const suffix = `${process.env.JEST_WORKER_ID}${Date.now()}`
    const scopeDomain = `sub-pb-${suffix}.invalid`
    const subadminUsername = `subpbadmin${suffix}`
    const scopeContractIds: number[] = []
    const scopeProvisioningSubscriberIds: number[] = []
    let scopeBillingDomainId: number
    let scopeProvisioningDomainId: number
    const resellerCreds = {username: `mockResellerUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const resellerDomain = `sub-pb-rs-${suffix}.invalid`
    let otherResellerContractId: number
    let otherResellerId: number
    let otherContactId: number
    let otherCustomerId: number
    let otherBillingDomainId: number
    let otherProvisioningDomainId: number
    let otherSubscriberId: number
    let otherProvisioningSubscriberId: number
    const startedAt = Date.now() / 1000

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [SubscriberPhonebookModule, AppModule],
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
        await db.billing.Admin.delete({login: resellerCreds.username})
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
            it('create phonebook bulk with purge_existing', async () => {
                const contract = await db.billing.Contract.create({
                    contact_id: 1,
                    product_id: 4,
                }).save()
                createdContractIds.push(contract.id)
                const domain = await db.billing.Domain.create({
                    domain: 'sub_pb_test_dom1',
                    reseller_id: 1,
                }).save()
                createdDomainIds.push(domain.id)
                const insertResult = await BillingVoipSubscriber.insert({ // insert instead of create to avoid a cyclic dependency error
                    contract_id: contract.id,
                    uuid: uuidv4(),
                    username: 'sub_pb_test1',
                    domain_id: domain.id,
                    status: 'active',
                })
                const subscriber = insertResult.identifiers[0]
                createdSubscriberIds.push(subscriber.id)

                // test this first so it doesnt affect other tests via purge
                const purgeTest = await db.billing.SubscriberPhonebook.create({
                    subscriber_id: subscriber.id,
                    name: 'test',
                    number: '123',
                }).save()
                createdPhonebookIds.push(purgeTest.id)

                const csvContent = [
                    'subscriber_id,name,number,shared',
                    `${subscriber.id},SUB_PHONEBOOK_TEST1,999999,1`,
                    `${subscriber.id},SUB_PHONEBOOK_TEST2,989832,0`,
                ].join('\n')

                const response = await request(app.getHttpServer())
                    .post('/api/subscribers/phonebook?purge_existing=true')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Prefer', 'return=representation')
                    .attach('file', Buffer.from(csvContent), 'subscriber_phonebook_test.csv')
                expect(response.status).toEqual(201)
                createdPhonebookIds.pop()
                createdPhonebookIds.push(+response.body.data[0].id)
                createdPhonebookIds.push(+response.body.data[1].id)

                const cnt = await db.billing.SubscriberPhonebook.count({where: {subscriber_id: subscriber.id}})
                expect(cnt).toEqual(2)
            })
            it('create phonebook', async () => {
                const phonebook1: PhonebookPost = {
                    name: 'test_phonebook1',
                    number: '123',
                    subscriber_id: createdSubscriberIds[0],
                    shared: false,
                }
                const response = await request(app.getHttpServer())
                    .post('/api/subscribers/phonebook')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(phonebook1)
                expect(response.status).toEqual(201)
                createdPhonebookIds.push(+response.body.data[0].id)
            })
            it('creates phonebook bulk from csv', async () => {
                const csvContent = [
                    'subscriber_id,name,number,shared',
                    `${createdSubscriberIds[0]},SUB_PHONEBOOK_TEST3,10003,1`,
                    `${createdSubscriberIds[0]},SUB_PHONEBOOK_TEST4,10004,0`,
                ].join('\n')
                const response = await request(app.getHttpServer())
                    .post('/api/subscribers/phonebook')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Prefer', 'return=representation')
                    .attach('file', Buffer.from(csvContent), 'subscriber_phonebook_test.csv')
                expect(response.status).toEqual(201)
                createdPhonebookIds.push(+response.body.data[0].id)
                createdPhonebookIds.push(+response.body.data[1].id)
            })
            it('fails to create phonebook bulk because duplicate', async () => {
                const csvContent = [
                    'subscriber_id,name,number,shared',
                    `${createdSubscriberIds[0]},SUB_PHONEBOOK_TEST3,10003,1`,
                    `${createdSubscriberIds[0]},SUB_PHONEBOOK_TEST4,10004,0`,
                ].join('\n')
                const response = await request(app.getHttpServer())
                    .post('/api/subscribers/phonebook')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .attach('file', Buffer.from(csvContent), 'subscriber_phonebook_test.csv')
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read created phonebook', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/subscribers/phonebook/${createdPhonebookIds[2]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const phonebook: SubscriberPhonebookResponseDto = response.body
                expect(phonebook.name).toEqual('test_phonebook1')
                expect(phonebook.number).toEqual('123')
                expect(phonebook.subscriber_id).toEqual(createdSubscriberIds[0])
            })
            it('read created phonebook from csv', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/subscribers/phonebook/${createdPhonebookIds[3]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const phonebook: SubscriberPhonebookResponseDto = response.body
                expect(phonebook.name).toEqual('SUB_PHONEBOOK_TEST3')
            })
            it('read phonebook list filtered by subscriber', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/subscribers/phonebook?subscriber_id=${createdSubscriberIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(createdPhonebookIds.length)
                const entries: SubscriberPhonebookResponseDto[] = response.body.data
                expect(entries.map(e => +e.id).sort((a, b) => a - b)).toEqual([...createdPhonebookIds].sort((a, b) => a - b))
                expect(entries.every(e => e.subscriber_id === createdSubscriberIds[0])).toBe(true)
            })
            it('read non-existing phonebook', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/subscribers/phonebook/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            it('update phonebook test_phonebook1 > test_phonebook_foo', async () => {
                const phonebookfoo: PhonebookPost = {
                    name: 'test_phonebook_foo',
                    number: '123',
                    subscriber_id: createdSubscriberIds[0],
                    shared: true,
                }
                const response = await request(app.getHttpServer())
                    .put(`/api/subscribers/phonebook/${createdPhonebookIds[2]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(phonebookfoo)
                expect(response.status).toEqual(204)
            })
            it('read updated phonebook', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/subscribers/phonebook/${createdPhonebookIds[2]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const phonebookset: SubscriberPhonebookResponseDto = response.body
                expect(phonebookset.name).toEqual('test_phonebook_foo')
            })
            it('update non-existing phonebook', async () => {
                const phonebookfoo: PhonebookPost = {
                    name: 'test_phonebook_foo_bar',
                    number: '1234',
                    subscriber_id: createdSubscriberIds[0],
                    shared: true,
                }
                const response = await request(app.getHttpServer())
                    .put('/api/subscribers/phonebook/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(phonebookfoo)
                expect(response.status).toEqual(404)
            })
        })

        describe('PATCH', () => {
            const patch: PatchOperation[] = [
                {
                    op: 'replace',
                    path: '/name',
                    value: 'test_phonebook_foobar',
                },
                {
                    op: 'replace',
                    path: '/number',
                    value: '999',
                },
            ]
            it('adjust phonebook', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/subscribers/phonebook/${createdPhonebookIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(204)
            })
            it('read updated phonebook  5', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/subscribers/phonebook/${createdPhonebookIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const phonebookset: SubscriberPhonebookResponseDto = response.body
                expect(phonebookset.name).toEqual('test_phonebook_foobar')
                expect(phonebookset.number).toEqual('999')
            })
            it('adjust non-existing phonebook', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/subscribers/phonebook/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })
        describe('subscriberadmin scope', () => {
            let ownCustomerId: number
            let subadminId: number
            let colleagueId: number
            let foreignSubscriberId: number
            let foreignEntryId: number
            const ownEntryIds: number[] = []

            const asSubadmin = (req: request.Test): request.Test => req
                .auth(`${subadminUsername}@${scopeDomain}`, 'mockSubscriberWebpassword')
                .set('X-Auth-Realm', 'subscriber')
                .set('Accept', 'application/json')

            const insertBillingSubscriber = async (contractId: number, username: string): Promise<{id: number, uuid: string}> => {
                const uuid = uuidv4()
                const result = await BillingVoipSubscriber.insert({
                    contract_id: contractId,
                    uuid: uuid,
                    username: username,
                    domain_id: scopeBillingDomainId,
                    status: 'active',
                })
                return {id: result.identifiers[0].id, uuid}
            }

            it('create two customers with subscribers and a subscriberadmin', async () => {
                scopeBillingDomainId = (await db.billing.Domain.create({domain: scopeDomain, reseller_id: 1}).save()).id
                scopeProvisioningDomainId = (await db.provisioning.VoipDomain.create({domain: scopeDomain}).save()).id
                ownCustomerId = (await db.billing.Contract.create({contact_id: 1, product_id: 4}).save()).id
                const foreignCustomerId = (await db.billing.Contract.create({contact_id: 1, product_id: 4}).save()).id
                scopeContractIds.push(ownCustomerId, foreignCustomerId)

                const subadmin = await insertBillingSubscriber(ownCustomerId, subadminUsername)
                subadminId = subadmin.id
                scopeProvisioningSubscriberIds.push((await db.provisioning.VoipSubscriber.insert({
                    username: subadminUsername,
                    domain_id: scopeProvisioningDomainId,
                    uuid: subadmin.uuid,
                    password: uuidv4().slice(0, 16),
                    webusername: subadminUsername,
                    webpassword: 'mockSubscriberWebpassword',
                    webpassword_modify_timestamp: new Date(),
                    admin: true,
                    account_id: ownCustomerId,
                })).identifiers[0].id)
                colleagueId = (await insertBillingSubscriber(ownCustomerId, `subpbcolleague${suffix}`)).id
                foreignSubscriberId = (await insertBillingSubscriber(foreignCustomerId, `subpbforeign${suffix}`)).id
                foreignEntryId = (await db.billing.SubscriberPhonebook.create({
                    subscriber_id: foreignSubscriberId, name: 'foreign', number: '5100', shared: false,
                }).save()).id
            })
            it('create an entry for a subscriber of the own customer', async () => {
                const response = await asSubadmin(request(app.getHttpServer()).post('/api/subscribers/phonebook'))
                    .set('Content-Type', 'application/json')
                    .send({name: 'colleague', number: '5101', subscriber_id: colleagueId, shared: false})
                expect(response.status).toEqual(201)
                ownEntryIds.push(+response.body.data[0].id)
            })
            it('reject an entry for a subscriber of another customer', async () => {
                const response = await asSubadmin(request(app.getHttpServer()).post('/api/subscribers/phonebook'))
                    .set('Content-Type', 'application/json')
                    .send({name: 'foreign', number: '5102', subscriber_id: foreignSubscriberId, shared: false})
                expect(response.status).toEqual(422)
            })
            it('import for a subscriber of the own customer', async () => {
                const csvContent = ['subscriber_id,name,number,shared', `${colleagueId},colleague_csv,5103,0`].join('\n')
                const response = await asSubadmin(request(app.getHttpServer()).post('/api/subscribers/phonebook'))
                    .set('Prefer', 'return=representation')
                    .attach('file', Buffer.from(csvContent), 'subscriber_phonebook_test.csv')
                expect(response.status).toEqual(201)
                ownEntryIds.push(+response.body.data[0].id)
            })
            it('reject a csv import for a subscriber of another customer', async () => {
                const csvContent = ['subscriber_id,name,number,shared', `${foreignSubscriberId},foreign_csv,5104,0`].join('\n')
                const response = await asSubadmin(request(app.getHttpServer()).post('/api/subscribers/phonebook?purge_existing=true'))
                    .attach('file', Buffer.from(csvContent), 'subscriber_phonebook_test.csv')
                expect(response.status).toEqual(422)
                expect(await db.billing.SubscriberPhonebook.countBy({id: foreignEntryId})).toEqual(1)
            })
            it('list only entries of subscribers of the own customer', async () => {
                const response = await asSubadmin(request(app.getHttpServer()).get('/api/subscribers/phonebook'))
                expect(response.status).toEqual(200)
                const subscriberIds = response.body.data.map((e: SubscriberPhonebookResponseDto) => e.subscriber_id)
                expect(subscriberIds.every((id: number) => id == subadminId || id == colleagueId)).toBe(true)
                expect(response.body.data.map((e: SubscriberPhonebookResponseDto) => +e.id).sort()).toEqual([...ownEntryIds].sort())
            })
            it('not read an entry of another customer', async () => {
                const response = await asSubadmin(request(app.getHttpServer()).get(`/api/subscribers/phonebook/${foreignEntryId}`))
                expect(response.status).toEqual(404)
            })
            it('not move an own entry to a subscriber of another customer', async () => {
                const response = await asSubadmin(request(app.getHttpServer()).put(`/api/subscribers/phonebook/${ownEntryIds[0]}`))
                    .set('Content-Type', 'application/json')
                    .send({name: 'colleague', number: '5101', subscriber_id: foreignSubscriberId, shared: false})
                expect(response.status).toEqual(422)
            })
            it('not delete an entry of another customer', async () => {
                const response = await asSubadmin(request(app.getHttpServer()).delete(`/api/subscribers/phonebook/${foreignEntryId}`))
                expect(response.status).toEqual(404)
                expect(await db.billing.SubscriberPhonebook.countBy({id: foreignEntryId})).toEqual(1)
            })
            it('delete own entries', async () => {
                for (const id of ownEntryIds) {
                    const response = await asSubadmin(request(app.getHttpServer()).delete(`/api/subscribers/phonebook/${id}`))
                    expect(response.status).toEqual(204)
                }
                ownEntryIds.length = 0
            })
        })
        describe('reseller scope', () => {
            let resellerHeader: [string, string]
            let ownEntryId: number
            const foreignSubscriberId = (): number => createdSubscriberIds[0]

            it('create another reseller with a subscriber and log in as its reseller admin', async () => {
                const now = new Date()
                otherResellerContractId = (await db.billing.Contract.create({
                    contact_id: 2, product_id: 3, status: ContractStatus.Active, create_timestamp: now, modify_timestamp: now,
                }).save()).id
                otherResellerId = (await db.billing.Reseller.create({
                    contract_id: otherResellerContractId, name: `sub_pb_reseller_${suffix}`, status: ResellerStatus.Active,
                }).save()).id
                otherContactId = (await db.billing.Contact.create({
                    reseller_id: otherResellerId, email: `sub_pb_${suffix}@example.org`, create_timestamp: now,
                }).save()).id
                otherCustomerId = (await db.billing.Contract.create({
                    contact_id: otherContactId, product_id: 4, status: ContractStatus.Active, create_timestamp: now, modify_timestamp: now,
                }).save()).id
                otherBillingDomainId = (await db.billing.Domain.create({domain: resellerDomain, reseller_id: otherResellerId}).save()).id
                otherProvisioningDomainId = (await db.provisioning.VoipDomain.create({domain: resellerDomain}).save()).id
                const uuid = uuidv4()
                otherSubscriberId = (await BillingVoipSubscriber.insert({ // insert instead of create to avoid a cyclic dependency error
                    contract_id: otherCustomerId,
                    uuid: uuid,
                    username: `subpbreseller${suffix}`,
                    domain_id: otherBillingDomainId,
                    status: 'active',
                })).identifiers[0].id
                otherProvisioningSubscriberId = (await db.provisioning.VoipSubscriber.insert({
                    username: `subpbreseller${suffix}`,
                    domain_id: otherProvisioningDomainId,
                    uuid: uuid,
                    password: uuidv4().slice(0, 16),
                    account_id: otherCustomerId,
                })).identifiers[0].id
                await db.billing.ContractPhonebook.create({contract_id: otherCustomerId, name: 'reseller_customer', number: '5301'}).save()
                await db.billing.ResellerPhonebook.create({reseller_id: otherResellerId, name: 'reseller_reseller', number: '5302'}).save()
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
                const response = await request(app.getHttpServer())
                    .post('/api/auth/jwt')
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(resellerCreds)
                expect(response.status).toEqual(201)
                resellerHeader = ['Authorization', 'Bearer ' + response.body['access_token']]
            })
            it('create an entry for an own subscriber', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/subscribers/phonebook')
                    .set(...resellerHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({name: 'reseller_entry', number: '5300', subscriber_id: otherSubscriberId, shared: false})
                expect(response.status).toEqual(201)
                ownEntryId = +response.body.data[0].id
            })
            it.each(['', '?purge_existing=true'])('reject a csv import for a subscriber of another reseller (%s)', async query => {
                const foreignCount = await db.billing.SubscriberPhonebook.countBy({subscriber_id: foreignSubscriberId()})
                expect(foreignCount).toBeGreaterThan(0)
                const csvContent = ['subscriber_id,name,number,shared', `${foreignSubscriberId()},foreign_csv,5304,0`].join('\n')
                const response = await request(app.getHttpServer())
                    .post(`/api/subscribers/phonebook${query}`)
                    .set(...resellerHeader)
                    .set('Accept', 'application/json')
                    .attach('file', Buffer.from(csvContent), 'subscriber_phonebook_test.csv')
                expect(response.status).toEqual(422)
                expect(await db.billing.SubscriberPhonebook.countBy({subscriber_id: foreignSubscriberId()})).toEqual(foreignCount)
            })
            it('not move an own entry to a subscriber of another reseller with PUT', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/subscribers/phonebook/${ownEntryId}`)
                    .set(...resellerHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({name: 'reseller_entry', number: '5300', subscriber_id: foreignSubscriberId(), shared: false})
                expect(response.status).toEqual(422)
                expect(await db.billing.SubscriberPhonebook.findOneByOrFail({id: ownEntryId}))
                    .toMatchObject({subscriber_id: otherSubscriberId})
            })
            it('not move an own entry to a subscriber of another reseller with PATCH', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/subscribers/phonebook/${ownEntryId}`)
                    .set(...resellerHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/subscriber_id', value: foreignSubscriberId()}])
                expect(response.status).toEqual(422)
                expect(await db.billing.SubscriberPhonebook.findOneByOrFail({id: ownEntryId}))
                    .toMatchObject({subscriber_id: otherSubscriberId})
            })
            it.each([
                ['', 1],
                ['?include=customer', 2],
                ['?include=reseller', 2],
                ['?include=all', 3],
            ])('list only entries of own subscribers (%s)', async (query, count) => {
                const response = await request(app.getHttpServer())
                    .get(`/api/subscribers/phonebook${query}`)
                    .set(...resellerHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(count)
                expect(response.body.data).toHaveLength(count)
                expect(response.body.data.every((e: SubscriberPhonebookResponseDto) => e.subscriber_id == otherSubscriberId)).toBe(true)
            })
        })
    })

    describe('Subscriber Phonebook DELETE', () => {
        it('delete created phonebook', async () => {
            for (const id of createdPhonebookIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/api/subscribers/phonebook/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(result.status).toEqual(204)
            }
            if (createdContractIds.length)
                await db.billing.Contract.delete(createdContractIds)
            if (createdDomainIds.length)
                await db.billing.Domain.delete(createdDomainIds)
        })
        it('delete the subscriberadmin scope fixtures', async () => {
            if (scopeContractIds.length) {
                const subscribers = await BillingVoipSubscriber.findBy({contract_id: In(scopeContractIds)})
                if (subscribers.length) {
                    await db.billing.SubscriberPhonebook.delete({subscriber_id: In(subscribers.map(sub => sub.id))})
                    await BillingVoipSubscriber.delete(subscribers.map(sub => sub.id))
                }
            }
            if (scopeProvisioningSubscriberIds.length)
                await db.provisioning.VoipSubscriber.delete(scopeProvisioningSubscriberIds)
            if (scopeContractIds.length)
                await db.billing.Contract.delete(scopeContractIds)
            if (scopeBillingDomainId)
                await db.billing.Domain.delete(scopeBillingDomainId)
            if (scopeProvisioningDomainId)
                await db.provisioning.VoipDomain.delete(scopeProvisioningDomainId)
        })
        it('delete the reseller scope fixtures', async () => {
            if (otherSubscriberId) {
                await db.billing.SubscriberPhonebook.delete({subscriber_id: otherSubscriberId})
                await BillingVoipSubscriber.delete(otherSubscriberId)
            }
            if (otherProvisioningSubscriberId)
                await db.provisioning.VoipSubscriber.delete(otherProvisioningSubscriberId)
            if (otherCustomerId) {
                await db.billing.ContractPhonebook.delete({contract_id: otherCustomerId})
                await db.billing.Contract.delete(otherCustomerId)
            }
            if (otherContactId)
                await db.billing.Contact.delete(otherContactId)
            if (otherBillingDomainId)
                await db.billing.Domain.delete(otherBillingDomainId)
            if (otherProvisioningDomainId)
                await db.provisioning.VoipDomain.delete(otherProvisioningDomainId)
            await db.billing.Journal.delete({username: resellerCreds.username, timestamp: MoreThanOrEqual(startedAt)})
            if (otherResellerId) {
                await db.billing.ResellerPhonebook.delete({reseller_id: otherResellerId})
                await db.billing.Reseller.delete(otherResellerId)
            }
            if (otherResellerContractId)
                await db.billing.Contract.delete(otherResellerContractId)
        })
        it('delete created journals', async () => {
            await db.billing.Journal.delete({username: creds.username, timestamp: MoreThanOrEqual(startedAt)})
            await db.billing.Journal.delete({username: In([subadminUsername, `${subadminUsername}@${scopeDomain}`]), timestamp: MoreThanOrEqual(startedAt)})
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
            await db.billing.Admin.delete({login: resellerCreds.username})
        })
    })
})
