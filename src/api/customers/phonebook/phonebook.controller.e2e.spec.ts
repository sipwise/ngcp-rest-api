
import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {In, MoreThanOrEqual} from 'typeorm'
import {v4 as uuidv4} from 'uuid'

import {CustomerPhonebookResponseDto} from './dto/phonebook-response.dto'
import {CustomerPhonebookModule} from './phonebook.module'

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
    customer_id: number
}

describe('Customer Phonebook', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    const createdPhonebookIds: number[] = []
    const createdContractIds: number[] = []
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const resellerCreds = {username: `mockResellerUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const suffix = `${process.env.JEST_WORKER_ID}${Date.now()}`
    const createdContactIds: number[] = []
    let otherResellerContractId: number
    let otherResellerId: number
    let otherCustomerId: number
    let resellerHeader: [string, string]
    const scopeDomain = `cust-pb-${suffix}.invalid`
    const subadminUsername = `custpbadmin${suffix}`
    let scopeCustomerId: number
    let scopeBillingDomainId: number
    let scopeProvisioningDomainId: number
    let scopeProvisioningSubscriberId: number
    const startedAt = Date.now() / 1000

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CustomerPhonebookModule, AppModule],
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
                // test this first so it doesnt affect other tests via purge
                const purgeTest = await db.billing.ContractPhonebook.create({
                    contract_id: contract.id,
                    name: 'test',
                    number: '123',
                }).save()
                createdPhonebookIds.push(purgeTest.id)

                const csvContent = [
                    'customer_id,name,number',
                    `${contract.id},CUST_PHONEBOOK_TEST1,999999`,
                    `${contract.id},CUST_PHONEBOOK_TEST2,989832`,
                ].join('\n')

                const response = await request(app.getHttpServer())
                    .post('/api/customers/phonebook?purge_existing=true')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Prefer', 'return=representation')
                    .attach('file', Buffer.from(csvContent), 'customer_phonebook_test.csv')
                expect(response.status).toEqual(201)
                createdPhonebookIds.pop()
                createdPhonebookIds.push(+response.body.data[0].id)
                createdPhonebookIds.push(+response.body.data[1].id)

                const cnt = await db.billing.ContractPhonebook.count({where: {contract_id: contract.id}})
                expect(cnt).toEqual(2)
            })
            it('create phonebook', async () => {
                const phonebook1: PhonebookPost = {
                    name: 'test_phonebook1',
                    number: '123',
                    customer_id: createdContractIds[0],
                }
                const response = await request(app.getHttpServer())
                    .post('/api/customers/phonebook')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(phonebook1)
                expect(response.status).toEqual(201)
                createdPhonebookIds.push(+response.body.data[0].id)
            })
            it('creates phonebook bulk from csv', async () => {
                const csvContent = [
                    'customer_id,name,number',
                    `${createdContractIds[0]},CUST_PHONEBOOK_TEST3,70003`,
                    `${createdContractIds[0]},CUST_PHONEBOOK_TEST4,70004`,
                ].join('\n')
                const response = await request(app.getHttpServer())
                    .post('/api/customers/phonebook')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Prefer', 'return=representation')
                    .attach('file', Buffer.from(csvContent), 'customer_phonebook_test.csv')
                expect(response.status).toEqual(201)
                createdPhonebookIds.push(+response.body.data[0].id)
                createdPhonebookIds.push(+response.body.data[1].id)
            })
            it('fails to create phonebook bulk because duplicate', async () => {
                const csvContent = [
                    'customer_id,name,number',
                    `${createdContractIds[0]},CUST_PHONEBOOK_TEST3,70003`,
                    `${createdContractIds[0]},CUST_PHONEBOOK_TEST4,70004`,
                ].join('\n')
                const response = await request(app.getHttpServer())
                    .post('/api/customers/phonebook')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .attach('file', Buffer.from(csvContent), 'customer_phonebook_test.csv')
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read phonebook collection', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/customers/phonebook?customer_id=${createdContractIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(5)
                expect(response.body.data).toHaveLength(5)
            })
            it('read created phonebook', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/customers/phonebook/${createdPhonebookIds[2]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const phonebook: CustomerPhonebookResponseDto = response.body
                expect(phonebook.name).toEqual('test_phonebook1')
                expect(phonebook.number).toEqual('123')
                expect(phonebook.customer_id).toEqual(createdContractIds[0])
            })
            it('read created phonebook from csv', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/customers/phonebook/${createdPhonebookIds[3]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const phonebook: CustomerPhonebookResponseDto = response.body
                expect(phonebook.name).toEqual('CUST_PHONEBOOK_TEST3')
            })
            it('read phonebook as csv', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/customers/phonebook?customer_id=${createdContractIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'text/csv')
                expect(response.status).toEqual(200)
                expect(response.headers['content-type']).toContain('text/csv')
                expect(response.text).toContain('CUST_PHONEBOOK_TEST3')
            })
            it('read non-existing phonebook', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/customers/phonebook/999911111122')
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
                    customer_id: createdContractIds[0],
                }
                const response = await request(app.getHttpServer())
                    .put(`/api/customers/phonebook/${createdPhonebookIds[2]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(phonebookfoo)
                expect(response.status).toEqual(204)
            })
            it('read updated phonebook', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/customers/phonebook/${createdPhonebookIds[2]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const phonebookset: CustomerPhonebookResponseDto = response.body
                expect(phonebookset.name).toEqual('test_phonebook_foo')
            })
            it('update phonebook bulk', async () => {
                const response = await request(app.getHttpServer())
                    .put('/api/customers/phonebook')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        [createdPhonebookIds[0]]: {name: 'test_phonebook_bulk_put0', number: '501', customer_id: createdContractIds[0]},
                        [createdPhonebookIds[1]]: {name: 'test_phonebook_bulk_put1', number: '502', customer_id: createdContractIds[0]},
                    })
                expect(response.status).toEqual(204)
            })
            it('read bulk updated phonebook', async () => {
                const expected = [['test_phonebook_bulk_put0', '501'], ['test_phonebook_bulk_put1', '502']]
                for (const [i, [name, number]] of expected.entries()) {
                    const response = await request(app.getHttpServer())
                        .get(`/api/customers/phonebook/${createdPhonebookIds[i]}`)
                        .set(...authHeader)
                        .set('Accept', 'application/json')
                    expect(response.status).toEqual(200)
                    const phonebookset: CustomerPhonebookResponseDto = response.body
                    expect(phonebookset.name).toEqual(name)
                    expect(phonebookset.number).toEqual(number)
                    expect(phonebookset.customer_id).toEqual(createdContractIds[0])
                }
            })
            it('update non-existing phonebook', async () => {
                const phonebookfoo: PhonebookPost = {
                    name: 'test_phonebook_foo_bar',
                    number: '1234',
                    customer_id: createdContractIds[0],
                }
                const response = await request(app.getHttpServer())
                    .put('/api/customers/phonebook/999911111122')
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
                    .patch(`/api/customers/phonebook/${createdPhonebookIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(204)
            })
            it('read updated phonebook  5', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/customers/phonebook/${createdPhonebookIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const phonebookset: CustomerPhonebookResponseDto = response.body
                expect(phonebookset.name).toEqual('test_phonebook_foobar')
                expect(phonebookset.number).toEqual('999')
            })
            it('adjust phonebook bulk', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/customers/phonebook')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send({
                        [createdPhonebookIds[1]]: [{op: 'replace', path: '/name', value: 'test_phonebook_bulk_patch1'}],
                        [createdPhonebookIds[2]]: [{op: 'replace', path: '/number', value: '777'}],
                    })
                expect(response.status).toEqual(204)
            })
            it('read bulk adjusted phonebook', async () => {
                const first = await request(app.getHttpServer())
                    .get(`/api/customers/phonebook/${createdPhonebookIds[1]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(first.status).toEqual(200)
                expect(first.body.name).toEqual('test_phonebook_bulk_patch1')
                expect(first.body.number).toEqual('502')
                const second = await request(app.getHttpServer())
                    .get(`/api/customers/phonebook/${createdPhonebookIds[2]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(second.status).toEqual(200)
                expect(second.body.name).toEqual('test_phonebook_foo')
                expect(second.body.number).toEqual('777')
            })
            it('adjust non-existing phonebook', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/customers/phonebook/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })

        describe('reseller scope', () => {
            const ownEntryIds: number[] = []
            const foreignEntryId = (): number => createdPhonebookIds[0]
            it('create another reseller with a customer and log in as its reseller admin', async () => {
                const now = new Date()
                otherResellerContractId = (await db.billing.Contract.create({
                    contact_id: 2, product_id: 3, status: ContractStatus.Active, create_timestamp: now, modify_timestamp: now,
                }).save()).id
                otherResellerId = (await db.billing.Reseller.create({
                    contract_id: otherResellerContractId, name: `pb_reseller_${suffix}`, status: ResellerStatus.Active,
                }).save()).id
                const contact = await db.billing.Contact.create({
                    reseller_id: otherResellerId, email: `pb_${suffix}@example.org`, create_timestamp: now,
                }).save()
                createdContactIds.push(contact.id)
                otherCustomerId = (await db.billing.Contract.create({
                    contact_id: contact.id, product_id: 4, status: ContractStatus.Active, create_timestamp: now, modify_timestamp: now,
                }).save()).id
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
            it('create an entry for an own customer', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/customers/phonebook')
                    .set(...resellerHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({name: 'reseller_entry', number: '4711', customer_id: otherCustomerId})
                expect(response.status).toEqual(201)
                ownEntryIds.push(+response.body.data[0].id)
            })
            it('reject an entry for a customer of another reseller', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/customers/phonebook')
                    .set(...resellerHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({name: 'foreign_entry', number: '4712', customer_id: createdContractIds[0]})
                expect(response.status).toEqual(422)
            })
            it('reject a csv import for a customer of another reseller', async () => {
                const csvContent = ['customer_id,name,number', `${createdContractIds[0]},foreign_csv,4713`].join('\n')
                const response = await request(app.getHttpServer())
                    .post('/api/customers/phonebook?purge_existing=true')
                    .set(...resellerHeader)
                    .set('Accept', 'application/json')
                    .attach('file', Buffer.from(csvContent), 'customer_phonebook_test.csv')
                expect(response.status).toEqual(422)
                expect(await db.billing.ContractPhonebook.countBy({contract_id: createdContractIds[0]})).toBeGreaterThan(0)
            })
            it('list only entries of own customers', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/customers/phonebook')
                    .set(...resellerHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(1)
                expect(response.body.data.map((e: CustomerPhonebookResponseDto) => +e.id)).toEqual(ownEntryIds)
            })
            it.each(['all', 'shared', 'reseller'])('list only entries of own customers with include=%s', async include => {
                const response = await request(app.getHttpServer())
                    .get(`/api/customers/phonebook?include=${include}`)
                    .set(...resellerHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.data.every((e: CustomerPhonebookResponseDto) => e.customer_id == otherCustomerId)).toBe(true)
            })
            it('not read an entry of another reseller', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/customers/phonebook/${foreignEntryId()}`)
                    .set(...resellerHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })
            it('not update an entry of another reseller', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/customers/phonebook/${foreignEntryId()}`)
                    .set(...resellerHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({name: 'foreign_put', number: '4714', customer_id: otherCustomerId})
                expect(response.status).toEqual(404)
            })
            it('not move an own entry to a customer of another reseller', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/customers/phonebook/${ownEntryIds[0]}`)
                    .set(...resellerHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({name: 'reseller_entry', number: '4711', customer_id: createdContractIds[0]})
                expect(response.status).toEqual(422)
            })
            it('not delete an entry of another reseller', async () => {
                const response = await request(app.getHttpServer())
                    .delete(`/api/customers/phonebook/${foreignEntryId()}`)
                    .set(...resellerHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
                expect(await db.billing.ContractPhonebook.countBy({id: foreignEntryId()})).toEqual(1)
            })
            it('delete an own entry', async () => {
                const response = await request(app.getHttpServer())
                    .delete(`/api/customers/phonebook/${ownEntryIds[0]}`)
                    .set(...resellerHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(204)
                ownEntryIds.pop()
            })
        })
        describe('subscriberadmin scope', () => {
            let ownEntryId: number
            const asSubadmin = (req: request.Test): request.Test => req
                .auth(`${subadminUsername}@${scopeDomain}`, 'mockSubscriberWebpassword')
                .set('X-Auth-Realm', 'subscriber')
                .set('Accept', 'application/json')

            it('create a customer with a subscriberadmin', async () => {
                scopeBillingDomainId = (await db.billing.Domain.create({domain: scopeDomain, reseller_id: 1}).save()).id
                scopeProvisioningDomainId = (await db.provisioning.VoipDomain.create({domain: scopeDomain}).save()).id
                scopeCustomerId = (await db.billing.Contract.create({contact_id: 1, product_id: 4}).save()).id
                const uuid = uuidv4()
                await BillingVoipSubscriber.insert({ // insert instead of create to avoid a cyclic dependency error
                    contract_id: scopeCustomerId,
                    uuid: uuid,
                    username: subadminUsername,
                    domain_id: scopeBillingDomainId,
                    status: 'active',
                })
                scopeProvisioningSubscriberId = (await db.provisioning.VoipSubscriber.insert({
                    username: subadminUsername,
                    domain_id: scopeProvisioningDomainId,
                    uuid: uuid,
                    password: uuidv4().slice(0, 16),
                    webusername: subadminUsername,
                    webpassword: 'mockSubscriberWebpassword',
                    webpassword_modify_timestamp: new Date(),
                    admin: true,
                    account_id: scopeCustomerId,
                })).identifiers[0].id
            })
            it('create an entry for the own customer', async () => {
                const response = await asSubadmin(request(app.getHttpServer()).post('/api/customers/phonebook'))
                    .set('Content-Type', 'application/json')
                    .send({name: 'subadmin_entry', number: '4721', customer_id: scopeCustomerId})
                expect(response.status).toEqual(201)
                ownEntryId = +response.body.data[0].id
            })
            it('not move an own entry to another customer with PUT', async () => {
                const response = await asSubadmin(request(app.getHttpServer()).put(`/api/customers/phonebook/${ownEntryId}`))
                    .set('Content-Type', 'application/json')
                    .send({name: 'subadmin_entry', number: '4721', customer_id: createdContractIds[0]})
                expect(response.status).toEqual(422)
                expect(await db.billing.ContractPhonebook.findOneByOrFail({id: ownEntryId}))
                    .toMatchObject({contract_id: scopeCustomerId, name: 'subadmin_entry'})
            })
            it('not move an own entry to another customer with PATCH', async () => {
                const response = await asSubadmin(request(app.getHttpServer()).patch(`/api/customers/phonebook/${ownEntryId}`))
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/customer_id', value: createdContractIds[0]}])
                expect(response.status).toEqual(422)
                expect(await db.billing.ContractPhonebook.findOneByOrFail({id: ownEntryId}))
                    .toMatchObject({contract_id: scopeCustomerId})
            })
        })
    })

    describe('phonebook DELETE', () => {
        it('delete created phonebook', async () => {
            for (const id of createdPhonebookIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/api/customers/phonebook/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(result.status).toEqual(204)
            }
            if (otherCustomerId) {
                await db.billing.ContractPhonebook.delete({contract_id: otherCustomerId})
                createdContractIds.push(otherCustomerId)
            }
            if (createdContractIds.length)
                await db.billing.Contract.delete(createdContractIds)
            if (createdContactIds.length)
                await db.billing.Contact.delete(createdContactIds)
            await db.billing.Journal.delete({username: resellerCreds.username, timestamp: MoreThanOrEqual(startedAt)})
            if (otherResellerId)
                await db.billing.Reseller.delete(otherResellerId)
            if (otherResellerContractId)
                await db.billing.Contract.delete(otherResellerContractId)
        })
        it('delete the subscriberadmin scope fixtures', async () => {
            if (scopeCustomerId) {
                await db.billing.ContractPhonebook.delete({contract_id: scopeCustomerId})
                const subscribers = await BillingVoipSubscriber.findBy({contract_id: scopeCustomerId})
                if (subscribers.length)
                    await BillingVoipSubscriber.delete(subscribers.map(sub => sub.id))
            }
            if (scopeProvisioningSubscriberId)
                await db.provisioning.VoipSubscriber.delete(scopeProvisioningSubscriberId)
            if (scopeCustomerId)
                await db.billing.Contract.delete(scopeCustomerId)
            if (scopeBillingDomainId)
                await db.billing.Domain.delete(scopeBillingDomainId)
            if (scopeProvisioningDomainId)
                await db.provisioning.VoipDomain.delete(scopeProvisioningDomainId)
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
