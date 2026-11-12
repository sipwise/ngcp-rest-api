import {randomUUID} from 'crypto'

import {ClassSerializerInterceptor, HttpStatus, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {In} from 'typeorm'

import {SubscriberResponseDto} from './dto/subscriber-response.dto'
import {SubscriberRedisMockRepository} from './repositories/subscriber.redis.mock.repository'
import {SubscriberRedisRepository} from './repositories/subscriber.redis.repository'
import {SubscriberModule} from './subscriber.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'
import {VoipSubscriberStatus} from '~/entities/internal/voip-subscriber.internal.entity'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

const RESELLER_ID = 1
const RESELLER_PRODUCT_ID = 3
const SIPPEERING_PRODUCT_ID = 2
const SIPACCOUNT_PRODUCT_ID = 4
const PBXACCOUNT_PRODUCT_ID = 5
const SYSTEM_CONTACT_ID = 2

interface Login {
    username: string
    password: string
    realm?: string
}

interface Fixture {
    id: number
    provisioningId: number
    uuid: string
    webusername?: string
    primaryNumberId?: number
    aliasNumberIds: number[]
}

describe('Subscriber', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    const worker = process.env.JEST_WORKER_ID
    const suffix = `${worker}${Date.now()}`
    const prefix = `e2e-sub-${suffix}`
    const domain = `${prefix}.example.org`
    // unique number block of the run, 43 99 <sn>
    const snBase = `${worker}${String(Date.now()).slice(-8)}`
    const creds: Login = {username: `mockAdminUser${worker}`, password: 'mockAdminPass'}
    const resellerCreds: Login = {username: `mockResellerUser${worker}`, password: 'mockAdminPass'}
    const ccareCreds: Login = {username: `subccare${suffix}`, password: 'mockAdminPass'}
    const linterceptCreds: Login = {username: `subli${suffix}`, password: 'mockAdminPass'}
    const createdContractIds: number[] = []
    const createdContactIds: number[] = []
    const createdNumberIds: number[] = []
    const subscribers: Record<string, Fixture> = {}
    let billingDomainId: number
    let provisioningDomainId: number
    let otherResellerId: number
    let otherResellerContractId: number
    let sipCustomerId: number
    let pbxCustomerId: number
    let otherCustomerId: number
    let peeringContractId: number
    let customerContactId: number

    const insertAdmin = async (login: string, role: RbacRole, resellerId = RESELLER_ID): Promise<void> => {
        await db.billing.Admin.delete({login})
        const aclRole = await db.billing.AclRole.findOneByOrFail({role})
        await db.billing.Admin.insert({
            reseller_id: resellerId,
            login: login,
            saltedpass: 'mockAdminSaltedpass',
            saltedpass_modify_timestamp: new Date(),
            role_id: aclRole.id,
            is_master: true,
            is_superuser: role == RbacRole.admin,
            is_system: false,
            is_ccare: role == RbacRole.ccare,
            lawful_intercept: role == RbacRole.lintercept,
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

    const createContract = async (productId: number, contactId: number, externalId?: string): Promise<number> => {
        const contract = await db.billing.Contract.create({
            contact_id: contactId,
            product_id: productId,
            external_id: externalId,
            status: ContractStatus.Active,
            create_timestamp: new Date(),
            modify_timestamp: new Date(),
        }).save()
        createdContractIds.push(contract.id)
        return contract.id
    }

    const createContact = async (resellerId: number, values: Partial<db.billing.Contact> = {}): Promise<number> => {
        const contact = await db.billing.Contact.create({
            reseller_id: resellerId,
            email: `${prefix}-${createdContactIds.length}@example.org`,
            create_timestamp: new Date(),
            ...values,
        }).save()
        createdContactIds.push(contact.id)
        return contact.id
    }

    const createNumber = async (sn: string, subscriberId: number): Promise<number> => {
        const number = await db.billing.VoipNumber.create({
            cc: 43, ac: '99', sn: `${snBase}${sn}`, reseller_id: RESELLER_ID, subscriber_id: subscriberId,
        }).save()
        createdNumberIds.push(number.id)
        return number.id
    }

    const createDbAlias = async (sn: string, subscriber: Fixture, isPrimary: boolean, isDevId = false): Promise<void> => {
        await db.provisioning.VoipDBAlias.insert({
            username: `4399${snBase}${sn}`,
            domain_id: provisioningDomainId,
            subscriber_id: subscriber.provisioningId,
            is_primary: isPrimary,
            is_devid: isDevId,
        })
    }

    const setPreference = async (subscriber: Fixture, attribute: string, value: string): Promise<void> => {
        const preference = await db.provisioning.VoipPreference.findOneByOrFail({attribute})
        await db.provisioning.VoipUsrPreference.insert({
            subscriber_id: subscriber.provisioningId, attribute_id: preference.id, value,
        })
    }

    const createSubscriber = async (
        name: string,
        contractId: number,
        billing: Partial<db.billing.VoipSubscriber> = {},
        provisioning: Partial<db.provisioning.VoipSubscriber> = {},
    ): Promise<Fixture> => {
        const uuid = randomUUID()
        const username = `${name}${suffix}`
        const result = await db.billing.VoipSubscriber.insert({
            contract_id: contractId,
            uuid,
            username,
            domain_id: billingDomainId,
            status: VoipSubscriberStatus.Active,
            ...billing,
        })
        const now = new Date()
        const provisioningResult = await db.provisioning.VoipSubscriber.insert({
            username,
            domain_id: provisioningDomainId,
            uuid,
            password: randomUUID().slice(0, 16),
            webusername: `w${username}`,
            webpassword: 'mockSubscriberWebpassword',
            webpassword_modify_timestamp: now,
            account_id: contractId,
            create_timestamp: now.toISOString().slice(0, 19).replace('T', ' '),
            ...provisioning,
        })
        subscribers[name] = {
            id: (result.identifiers[0] as {id: number}).id,
            provisioningId: (provisioningResult.identifiers[0] as {id: number}).id,
            uuid,
            webusername: `w${username}`,
            aliasNumberIds: [],
        }
        return subscribers[name]
    }

    const addNumbers = async (subscriber: Fixture, primary: string, aliases: [string, boolean][] = []): Promise<void> => {
        subscriber.primaryNumberId = await createNumber(primary, subscriber.id)
        await db.billing.VoipSubscriber.update(subscriber.id, {primary_number_id: subscriber.primaryNumberId})
        await createDbAlias(primary, subscriber, true)
        for (const [sn, isDevId] of aliases) {
            subscriber.aliasNumberIds.push(await createNumber(sn, subscriber.id))
            await createDbAlias(sn, subscriber, false, isDevId)
        }
    }

    const subscriberLogin = (name: string): Login => ({
        username: `${subscribers[name].webusername}@${domain}`,
        password: 'mockSubscriberWebpassword',
        realm: 'subscriber',
    })

    const get = (url: string, user: Login = creds): request.Test => {
        const req = request(app.getHttpServer())
            .get(url)
            .auth(user.username, user.password)
            .set('Accept', 'application/json')
        return user.realm ? req.set('X-Auth-Realm', user.realm) : req
    }

    const list = (query: string, user: Login = creds): request.Test =>
        get(`/api/subscribers?domain=${domain}${query.includes('rows=') ? '' : '&rows=50'}${query ? `&${query}` : ''}`, user)

    const ids = (response: request.Response): number[] =>
        (response.body.data as SubscriberResponseDto[]).map(s => s.id)

    const idsOf = (...names: string[]): number[] => names.map(name => subscribers[name].id).sort((a, b) => a - b)

    // write tests
    const wdomain = `w${domain}`
    const strongPassword = 'Ab1!Cd2@Ef3#gh'
    const created: Record<string, number> = {}
    let wBillingDomainId: number
    let wProvisioningDomainId: number
    let otherDomainId: number
    let otherProvisioningDomainId: number
    let wSipCustomerId: number
    let wPbxCustomerId: number
    let profileSetId: number
    let defaultProfileId: number
    let otherProfileId: number
    let otherResellerProfileSetId: number

    // delete tests
    const redisMock = new SubscriberRedisMockRepository()
    const ipGroupId = Number(`9${worker}${String(Date.now()).slice(-7)}`)
    let tPbxCustomerId: number

    const wNumber = (sn: string): {cc: number, ac: string, sn: string} => ({cc: 43, ac: '98', sn: `${snBase}${sn}`})

    const wLogin = (name: string): Login => ({username: `w${name}${suffix}@${wdomain}`, password: 'any', realm: 'subscriber'})

    const send = (method: 'post' | 'put' | 'patch', url: string, body: unknown, user: Login = creds): request.Test => {
        const req = request(app.getHttpServer())[method](url)
            .auth(user.username, user.password)
            .set('Accept', 'application/json')
            .set('Content-Type', method == 'patch' ? 'application/json-patch+json' : 'application/json')
            .set('Prefer', 'return=representation')
        return (user.realm ? req.set('X-Auth-Realm', user.realm) : req).send(body as object)
    }

    const sipBody = (name: string, values: object = {}): object => ({
        customer_id: wSipCustomerId,
        username: `${name}${suffix}`,
        domain: wdomain,
        password: 'sipPassword1',
        webusername: `w${name}${suffix}`,
        ...values,
    })

    /**
     * Creates a subscriber as admin (or the given login) and remembers its id
     */
    const createViaApi = async (name: string, body: object, user: Login = creds): Promise<SubscriberResponseDto> => {
        const response = await send('post', '/api/subscribers', body, user)
        expect(response.status).toEqual(HttpStatus.CREATED)
        const subscriber: SubscriberResponseDto = response.body.data[0]
        created[name] = subscriber.id
        return subscriber
    }

    const read = async (name: string): Promise<SubscriberResponseDto> => {
        const response = await get(`/api/subscribers/${created[name]}`)
        expect(response.status).toEqual(HttpStatus.OK)
        const subscriber: SubscriberResponseDto = response.body
        return subscriber
    }

    const errorPointers = (response: request.Response): string[] =>
        (response.body.errors as {pointer: string}[]).map(e => e.pointer)

    const errorCodes = (response: request.Response): string[] =>
        (response.body.errors as {code: string}[]).map(e => e.code)

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [SubscriberModule, AppModule],
        })
            .overrideProvider(SubscriberRedisRepository).useValue(redisMock)
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

        await insertAdmin(creds.username, RbacRole.admin)
        await insertAdmin(resellerCreds.username, RbacRole.reseller)
        await insertAdmin(ccareCreds.username, RbacRole.ccare)
        await insertAdmin(linterceptCreds.username, RbacRole.lintercept)

        otherResellerContractId = await createContract(RESELLER_PRODUCT_ID, SYSTEM_CONTACT_ID)
        otherResellerId = (await db.billing.Reseller.create({
            contract_id: otherResellerContractId,
            name: prefix,
            status: ResellerStatus.Active,
        }).save()).id

        billingDomainId = (await db.billing.Domain.create({domain, reseller_id: RESELLER_ID}).save()).id
        provisioningDomainId = (await db.provisioning.VoipDomain.create({domain}).save()).id

        customerContactId = await createContact(RESELLER_ID)
        sipCustomerId = await createContract(SIPACCOUNT_PRODUCT_ID, customerContactId, `${prefix}-cext`)
        pbxCustomerId = await createContract(PBXACCOUNT_PRODUCT_ID, customerContactId)
        otherCustomerId = await createContract(SIPACCOUNT_PRODUCT_ID, await createContact(otherResellerId))
        peeringContractId = await createContract(SIPPEERING_PRODUCT_ID, await createContact(RESELLER_ID))

        // sip customer: a subscriberadmin with numbers, contact and preferences, a locked subscriber, a terminated one
        const sipAdmin = await createSubscriber('sipadmin', sipCustomerId, {
            external_id: `${prefix}-sext`,
            contact_id: await createContact(RESELLER_ID, {email: `${prefix}-sipadmin@example.org`, timezone: 'Europe/Vienna'}),
        }, {admin: true, create_timestamp: '2001-02-03 10:00:00', modify_timestamp: '2001-02-03 10:00:00'})
        await addNumbers(sipAdmin, '10', [['11', false], ['12', true]])
        await setPreference(sipAdmin, 'lock', '3')
        await setPreference(sipAdmin, 'display_name', 'Sip Admin')
        const sipUser = await createSubscriber('sipuser', sipCustomerId, {status: VoipSubscriberStatus.Locked}, {create_timestamp: '2001-02-05 10:00:00'})
        await addNumbers(sipUser, '20')
        await createSubscriber('terminated', sipCustomerId, {status: VoipSubscriberStatus.Terminated})

        // pbx customer: pilot, seat, group with the seat as member, extension range
        const pilot = await createSubscriber('pilot', pbxCustomerId, {}, {admin: true, is_pbx_pilot: true})
        await addNumbers(pilot, '30', [['31', false]])
        const seat = await createSubscriber('seat', pbxCustomerId, {}, {pbx_extension: '101'})
        await addNumbers(seat, '30101')
        await setPreference(seat, 'display_name', 'Seat')
        const group = await createSubscriber('group', pbxCustomerId, {}, {
            is_pbx_group: true, pbx_extension: '200', pbx_hunt_policy: 'serial', pbx_hunt_timeout: 10, pbx_hunt_cancel_mode: 'bye',
        })
        await db.provisioning.VoipPbxGroup.insert({group_id: group.provisioningId, subscriber_id: seat.provisioningId})
        for (const [attribute, value] of [['ext_range_min', '100'], ['ext_range_max', '299']]) {
            const preference = await db.provisioning.VoipPreference.findOneByOrFail({attribute})
            await db.provisioning.VoipContractPreference.insert({contract_id: pbxCustomerId, attribute_id: preference.id, value})
        }

        await createSubscriber('other', otherCustomerId)
        await createSubscriber('peering', peeringContractId)

        // write tests: own domain, customers, profile sets and number block (43 98 <snBase>...)
        wBillingDomainId = (await db.billing.Domain.create({domain: wdomain, reseller_id: RESELLER_ID}).save()).id
        wProvisioningDomainId = (await db.provisioning.VoipDomain.create({domain: wdomain}).save()).id
        otherDomainId = (await db.billing.Domain.create({domain: `o${domain}`, reseller_id: otherResellerId}).save()).id
        otherProvisioningDomainId = (await db.provisioning.VoipDomain.create({domain: `o${domain}`}).save()).id
        wSipCustomerId = await createContract(SIPACCOUNT_PRODUCT_ID, customerContactId)
        wPbxCustomerId = await createContract(PBXACCOUNT_PRODUCT_ID, customerContactId)
        for (const [attribute, value] of [['ext_range_min', '100'], ['ext_range_max', '299']]) {
            const preference = await db.provisioning.VoipPreference.findOneByOrFail({attribute})
            await db.provisioning.VoipContractPreference.insert({contract_id: wPbxCustomerId, attribute_id: preference.id, value})
        }
        profileSetId = (await db.provisioning.VoipSubscriberProfileSet.insert({reseller_id: RESELLER_ID, name: prefix, description: ''})).identifiers[0].id
        defaultProfileId = (await db.provisioning.VoipSubscriberProfile.insert({set_id: profileSetId, name: 'default', description: '', set_default: true})).identifiers[0].id
        otherProfileId = (await db.provisioning.VoipSubscriberProfile.insert({set_id: profileSetId, name: 'other', description: '', set_default: false})).identifiers[0].id
        otherResellerProfileSetId = (await db.provisioning.VoipSubscriberProfileSet.insert({reseller_id: otherResellerId, name: prefix, description: ''})).identifiers[0].id
    })

    afterAll(async () => {
        if (appService.db.isInitialized)
            await appService.db.destroy()
        await app.close()
    })

    describe('', () => { // main tests block
        it('mock authService.compareBcryptPassword', async () => {
            jest.spyOn(authService, 'compareBcryptPassword').mockImplementation(async () => true)
            expect(await authService.compareBcryptPassword('123', '456')).toBe(true)
        })

        describe('GET list scope', () => {
            it.each([
                ['admin', (): Login => creds, ['sipadmin', 'sipuser', 'pilot', 'seat', 'group', 'other']],
                ['reseller', (): Login => resellerCreds, ['sipadmin', 'sipuser', 'pilot', 'seat', 'group']],
                ['ccare', (): Login => ccareCreds, ['sipadmin', 'sipuser', 'pilot', 'seat', 'group']],
                ['subscriberadmin (sip)', (): Login => subscriberLogin('sipadmin'), ['sipadmin', 'sipuser']],
                ['subscriberadmin (pbx pilot)', (): Login => subscriberLogin('pilot'), ['pilot', 'seat', 'group']],
                ['subscriber', (): Login => subscriberLogin('seat'), ['seat']],
            ])('%s lists its non-terminated customer subscribers', async (_role, login, names) => {
                const response = await list('', login())
                expect(response.status).toEqual(HttpStatus.OK)
                expect(ids(response)).toEqual(idsOf(...names))
                expect(response.body.total_count).toEqual(names.length)
            })

            it('rejects lintercept with 403', async () => {
                expect((await list('', linterceptCreds)).status).toEqual(HttpStatus.FORBIDDEN)
                expect((await get(`/api/subscribers/${subscribers.sipuser.id}`, linterceptCreds)).status).toEqual(HttpStatus.FORBIDDEN)
            })

            it('filters never widen the scope', async () => {
                expect(ids(await list(`customer_id=${sipCustomerId}`, subscriberLogin('seat')))).toEqual([])
                expect(ids(await list(`reseller_id=${otherResellerId}`, resellerCreds))).toEqual([])
                // search_or matches the domain of all fixtures, the scope keeps the own customer's subscribers
                expect(ids(await list(`id=${subscribers.pilot.id}&search_or=1&username=x`, subscriberLogin('sipadmin')))).toEqual(idsOf('sipadmin', 'sipuser'))
            })
        })

        describe('GET item', () => {
            it('returns all fields to admin roles', async () => {
                const response = await get(`/api/subscribers/${subscribers.sipadmin.id}`)
                expect(response.status).toEqual(HttpStatus.OK)
                const s = subscribers.sipadmin
                expect(response.body).toEqual({
                    id: s.id,
                    uuid: s.uuid,
                    customer_id: sipCustomerId,
                    username: `sipadmin${suffix}`,
                    domain: domain,
                    domain_id: billingDomainId,
                    status: 'active',
                    lock: '3',
                    external_id: `${prefix}-sext`,
                    email: `${prefix}-sipadmin@example.org`,
                    timezone: 'Europe/Vienna',
                    webusername: s.webusername,
                    administrative: true,
                    profile_set_id: null,
                    profile_id: null,
                    primary_number: {cc: 43, ac: '99', sn: `${snBase}10`, number_id: s.primaryNumberId},
                    alias_numbers: [
                        {cc: 43, ac: '99', sn: `${snBase}11`, number_id: s.aliasNumberIds[0], is_devid: false},
                        {cc: 43, ac: '99', sn: `${snBase}12`, number_id: s.aliasNumberIds[1], is_devid: true},
                    ],
                    display_name: 'Sip Admin',
                    create_timestamp: expect.any(String),
                    modify_timestamp: expect.any(String),
                })
                expect(new Date(response.body.create_timestamp)).toEqual(new Date(2001, 1, 3, 10))
            })

            it('returns the pbx fields of the pilot, seat and group', async () => {
                const pilot = (await get(`/api/subscribers/${subscribers.pilot.id}`)).body
                expect(pilot).toMatchObject({
                    is_pbx_pilot: true, is_pbx_group: false, pbx_extension: null, pbx_group_ids: [],
                    ext_range_min: 100, ext_range_max: 299, email: null, timezone: null, lock: null, display_name: null,
                })
                expect(pilot).not.toHaveProperty('pbx_hunt_policy')
                expect(pilot).not.toHaveProperty('pbx_groupmember_ids')

                const seat = (await get(`/api/subscribers/${subscribers.seat.id}`)).body
                expect(seat).toMatchObject({
                    is_pbx_pilot: false, is_pbx_group: false, pbx_extension: '101', display_name: 'Seat',
                    pbx_group_ids: [subscribers.group.id], administrative: false,
                })
                expect(seat).not.toHaveProperty('ext_range_min')

                const group = (await get(`/api/subscribers/${subscribers.group.id}`)).body
                expect(group).toMatchObject({
                    is_pbx_group: true, pbx_extension: '200', pbx_hunt_policy: 'serial', pbx_hunt_timeout: 10,
                    pbx_hunt_cancel_mode: 'bye', pbx_groupmember_ids: [subscribers.seat.id], primary_number: null, alias_numbers: [],
                })
                expect(group).not.toHaveProperty('pbx_group_ids')
            })

            it('leaves out the pbx fields for sip customers', async () => {
                const body = (await get(`/api/subscribers/${subscribers.sipuser.id}`)).body
                for (const field of ['is_pbx_pilot', 'is_pbx_group', 'pbx_extension', 'pbx_group_ids', 'ext_range_min'])
                    expect(body).not.toHaveProperty(field)
            })

            it('never returns password and webpassword', async () => {
                for (const login of [creds, subscriberLogin('pilot'), subscriberLogin('seat')]) {
                    const body = (await get(`/api/subscribers/${subscribers.seat.id}`, login)).body
                    expect(body.id).toEqual(subscribers.seat.id)
                    expect(body).not.toHaveProperty('password')
                    expect(body).not.toHaveProperty('webpassword')
                }
            })

            it('hides admin-only fields from subscriberadmin', async () => {
                const body = (await get(`/api/subscribers/${subscribers.seat.id}`, subscriberLogin('pilot'))).body
                expect(body).toMatchObject({customer_id: pbxCustomerId, administrative: false, profile_id: null})
                for (const field of ['uuid', 'external_id', 'lock', 'profile_set_id', 'create_timestamp', 'modify_timestamp'])
                    expect(body).not.toHaveProperty(field)
            })

            it('hides admin-only fields and customer_id from subscriber', async () => {
                const body = (await get(`/api/subscribers/${subscribers.seat.id}`, subscriberLogin('seat'))).body
                expect(body).toMatchObject({id: subscribers.seat.id, administrative: false, profile_id: null, pbx_extension: '101'})
                for (const field of ['uuid', 'customer_id', 'external_id', 'lock', 'profile_set_id', 'create_timestamp', 'modify_timestamp'])
                    expect(body).not.toHaveProperty(field)
            })

            it('shows the extension range to the pbx subscriberadmin', async () => {
                const body = (await get(`/api/subscribers/${subscribers.pilot.id}`, subscriberLogin('pilot'))).body
                expect(body).toMatchObject({ext_range_min: 100, ext_range_max: 299})
            })

            it.each([
                ['admin', (): Login => creds, 'terminated'],
                ['admin', (): Login => creds, 'peering'],
                ['reseller', (): Login => resellerCreds, 'other'],
                ['ccare', (): Login => ccareCreds, 'other'],
                ['subscriberadmin (sip)', (): Login => subscriberLogin('sipadmin'), 'pilot'],
                ['subscriberadmin (pbx pilot)', (): Login => subscriberLogin('pilot'), 'sipuser'],
                ['subscriber', (): Login => subscriberLogin('seat'), 'pilot'],
            ])('%s gets 404 for %s', async (_role, login, name) => {
                const response = await get(`/api/subscribers/${subscribers[name].id}`, login())
                expect(response.status).toEqual(HttpStatus.NOT_FOUND)
                expect(response.body.errorCode).toEqual('SUBSCRIBER_NOT_FOUND')
            })

            it('ignores list filters', async () => {
                const response = await get(`/api/subscribers/${subscribers.sipuser.id}?username=nomatch`)
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.id).toEqual(subscribers.sipuser.id)
            })

            it('expands customer_id', async () => {
                const response = await get(`/api/subscribers/${subscribers.sipuser.id}?expand=customer_id`)
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.customer_id_expand.id).toEqual(sipCustomerId)
            })
        })

        describe('GET list filters', () => {
            it.each([
                ['username wildcard', (): string => `username=sip*${suffix}`, ['sipadmin', 'sipuser']],
                ['webusername', (): string => `webusername=${subscribers.seat.webusername}`, ['seat']],
                ['customer_id', (): string => `customer_id=${pbxCustomerId}`, ['pilot', 'seat', 'group']],
                ['status', (): string => 'status=locked', ['sipuser']],
                ['create_timestamp', (): string => 'create_timestamp=2001-02-03*', ['sipadmin']],
                ['customer_external_id', (): string => `customer_external_id=${prefix}-cext`, ['sipadmin', 'sipuser']],
                ['subscriber_external_id', (): string => `subscriber_external_id=${prefix}-sext`, ['sipadmin']],
                ['is_pbx_group true', (): string => 'is_pbx_group=true', ['group']],
                ['is_pbx_group 1', (): string => 'is_pbx_group=1', ['group']],
                ['is_pbx_group false', (): string => `is_pbx_group=false&customer_id=${pbxCustomerId}`, ['pilot', 'seat']],
                ['is_pbx_group 0', (): string => `is_pbx_group=0&customer_id=${pbxCustomerId}`, ['pilot', 'seat']],
                ['is_admin', (): string => 'is_admin=true', ['sipadmin', 'pilot']],
                ['is_pbx_pilot', (): string => 'is_pbx_pilot=1', ['pilot']],
                ['alias', (): string => `alias=4399${snBase}12`, ['sipadmin']],
                ['alias wildcard', (): string => `alias=4399${snBase}3*`, ['pilot', 'seat']],
                ['reseller_id', (): string => `reseller_id=${otherResellerId}`, ['other']],
                ['contact_id', (): string => `contact_id=${customerContactId}`, ['sipadmin', 'sipuser', 'pilot', 'seat', 'group']],
                ['primary_number', (): string => `primary_number=4399${snBase}20`, ['sipuser']],
                ['primary_number wildcard', (): string => `primary_number=4399${snBase}30*`, ['pilot', 'seat']],
                ['pbx_extension', (): string => 'pbx_extension=101', ['seat']],
                ['display_name', (): string => 'display_name=Sip*', ['sipadmin']],
                ['create_timestamp_le', (): string => 'create_timestamp_le=2001-02-04', ['sipadmin']],
                ['create_timestamp range', (): string => 'create_timestamp_ge=2001-02-04&create_timestamp_le=2001-02-06', ['sipuser']],
                ['modify_timestamp_le', (): string => 'modify_timestamp_le=2001-02-04', ['sipadmin']],
                ['modify_timestamp_ge', (): string => `modify_timestamp_ge=2001-02-04&customer_id=${sipCustomerId}`, ['sipuser']],
            ])('%s', async (_name, query, names) => {
                const response = await list(query())
                expect(response.status).toEqual(HttpStatus.OK)
                expect(ids(response)).toEqual(idsOf(...names))
            })

            it('combines filters with search_or within the scope', async () => {
                const response = await get('/api/subscribers?search_or=1&pbx_extension=200&display_name=Seat', subscriberLogin('pilot'))
                expect(response.status).toEqual(HttpStatus.OK)
                expect(ids(response)).toEqual(idsOf('seat', 'group'))
            })

            it('rejects an invalid boolean filter with 400', async () => {
                expect((await list('is_pbx_pilot=yes')).status).toEqual(HttpStatus.BAD_REQUEST)
            })

            it('rejects an unknown filter with 400', async () => {
                expect((await list('lock=3')).status).toEqual(HttpStatus.BAD_REQUEST)
            })
        })

        describe('GET list order and pages', () => {
            it('orders by id by default', async () => {
                expect(ids(await list(''))).toEqual(idsOf('sipadmin', 'sipuser', 'pilot', 'seat', 'group', 'other'))
            })

            it('orders by username descending', async () => {
                const response = await list(`customer_id=${sipCustomerId}&order_by=username&order_by_direction=desc`)
                expect(ids(response)).toEqual([subscribers.sipuser.id, subscribers.sipadmin.id])
            })

            it('orders by pbx_extension and create_timestamp', async () => {
                const byExtension = await list(`customer_id=${pbxCustomerId}&order_by=pbx_extension&order_by_direction=desc`)
                expect(ids(byExtension)).toEqual([subscribers.group.id, subscribers.seat.id, subscribers.pilot.id])
                const byCreate = await list(`customer_id=${sipCustomerId}&order_by=create_timestamp&order_by_direction=desc`)
                expect(ids(byCreate)).toEqual([subscribers.sipuser.id, subscribers.sipadmin.id])
            })

            it('orders by subscriber_external_id', async () => {
                const response = await list(`customer_id=${sipCustomerId}&order_by=subscriber_external_id&order_by_direction=desc`)
                expect(ids(response)).toEqual([subscribers.sipadmin.id, subscribers.sipuser.id])
            })

            it.each(['password', 'is_admin', 'display_name'])('rejects order_by=%s with 400', async field => {
                expect((await list(`order_by=${field}`)).status).toEqual(HttpStatus.BAD_REQUEST)
            })

            it('pages the list', async () => {
                const response = await list('rows=2&page=2')
                expect(response.status).toEqual(HttpStatus.OK)
                expect(ids(response)).toEqual(idsOf('pilot', 'seat'))
                expect(response.body.total_count).toEqual(6)
            })
        })

        describe('GET journal', () => {
            it('is readable by admins', async () => {
                expect((await get(`/api/subscribers/${subscribers.sipuser.id}/journal`)).status).toEqual(HttpStatus.OK)
            })

            it.each([
                ['subscriberadmin', 'pilot'],
                ['subscriber', 'seat'],
            ])('rejects %s with 403', async (_role, name) => {
                const response = await get(`/api/subscribers/${subscribers[name].id}/journal`, subscriberLogin(name))
                expect(response.status).toEqual(HttpStatus.FORBIDDEN)
            })
        })

        describe('POST', () => {
            it('creates a SIP subscriber with numbers, contact, preferences and the default profile', async () => {
                const subscriber = await createViaApi('wsip', sipBody('wsip', {
                    primary_number: wNumber('100'),
                    alias_numbers: [{...wNumber('101'), is_devid: true}, wNumber('102')],
                    email: `${prefix}-wsip@example.org`,
                    timezone: 'Europe/Vienna',
                    display_name: 'W Sip',
                    external_id: `${prefix}-wext`,
                    lock: 2,
                    profile_set_id: profileSetId,
                }))
                expect(subscriber).toMatchObject({
                    customer_id: wSipCustomerId,
                    username: `wsip${suffix}`,
                    domain: wdomain,
                    domain_id: wBillingDomainId,
                    status: 'active',
                    lock: '2',
                    external_id: `${prefix}-wext`,
                    email: `${prefix}-wsip@example.org`,
                    timezone: 'Europe/Vienna',
                    webusername: `wwsip${suffix}`,
                    administrative: false,
                    profile_set_id: profileSetId,
                    profile_id: defaultProfileId,
                    primary_number: wNumber('100'),
                    display_name: 'W Sip',
                })
                expect(subscriber.alias_numbers).toEqual([
                    expect.objectContaining({...wNumber('101'), is_devid: true}),
                    expect.objectContaining({...wNumber('102'), is_devid: false}),
                ])
                expect(subscriber).not.toHaveProperty('password')
                expect(subscriber).not.toHaveProperty('is_pbx_pilot')
            })

            it('writes a journal entry per created subscriber', async () => {
                const response = await send('post', '/api/subscribers', [
                    sipBody('wbulk1', {primary_number: wNumber('110')}),
                    sipBody('wbulk2', {primary_number: wNumber('111'), status: 'locked'}),
                ])
                expect(response.status).toEqual(HttpStatus.CREATED)
                const [first, second] = response.body.data as SubscriberResponseDto[]
                created.wbulk1 = first.id
                created.wbulk2 = second.id
                expect(second).toMatchObject({status: 'locked', lock: '4'})
                for (const id of [first.id, second.id]) {
                    const journal = await get(`/api/subscribers/${id}/journal`)
                    expect(journal.status).toEqual(HttpStatus.OK)
                    expect(journal.body.total_count).toEqual(1)
                }
            })

            it.each([
                ['customer_id missing', {customer_id: undefined}, '/customer_id', 'SUBSCRIBER_CUSTOMER_REQUIRED'],
                ['unknown customer', {customer_id: 999999999}, '/customer_id', 'SUBSCRIBER_CUSTOMER_INVALID'],
                ['domain missing', {domain: undefined}, '/domain', 'SUBSCRIBER_DOMAIN_REQUIRED'],
                ['domain of another reseller', {domain: undefined, domain_id: -1}, '/domain_id', 'SUBSCRIBER_DOMAIN_INVALID'],
                ['existing username', {username: `sipadmin${suffix}`, domain}, '/username', 'SUBSCRIBER_EXISTS'],
                ['primary number missing', {primary_number: undefined}, '/primary_number', 'SUBSCRIBER_PRIMARY_NUMBER_REQUIRED'],
                ['number of another subscriber', {primary_number: wNumber('100')}, '/primary_number', 'SUBSCRIBER_NUMBER_IN_USE'],
                ['alias equal to the primary', {alias_numbers: [wNumber('120')]}, '/alias_numbers/0', 'SUBSCRIBER_NUMBER_DUPLICATE'],
                ['password missing', {password: undefined}, '/password', 'SUBSCRIBER_PASSWORD_REQUIRED'],
                ['profile set of another reseller', {profile_set_id: -1}, '/profile_set_id', 'SUBSCRIBER_PROFILE_SET_INVALID'],
                ['profile without profile set', {profile_id: -1}, '/profile_id', 'SUBSCRIBER_PROFILE_SET_REQUIRED'],
                ['PBX field on a SIP customer', {pbx_extension: '101'}, '/pbx_extension', 'SUBSCRIBER_PBX_FIELD_INVALID'],
            ])('rejects %s with 422', async (_case, values: Record<string, unknown>, pointer, code) => {
                const body = sipBody('winvalid', {primary_number: wNumber('120'), ...values})
                if ('domain_id' in values)
                    Object.assign(body, {domain_id: otherDomainId})
                if (values.profile_set_id == -1)
                    Object.assign(body, {profile_set_id: otherResellerProfileSetId})
                if (values.profile_id == -1)
                    Object.assign(body, {profile_id: otherProfileId})
                const response = await send('post', '/api/subscribers', body)
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                expect(response.body.errors).toContainEqual(expect.objectContaining({pointer, code}))
            })

            it('rejects a profile outside the profile set with 422', async () => {
                const set = (await db.provisioning.VoipSubscriberProfile.insert({set_id: otherResellerProfileSetId, name: 'x', description: ''})).identifiers[0].id
                const response = await send('post', '/api/subscribers', sipBody('winvalid', {
                    primary_number: wNumber('120'), profile_set_id: profileSetId, profile_id: set,
                }))
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                expect(errorCodes(response)).toEqual(['SUBSCRIBER_PROFILE_INVALID'])
            })

            it('rejects status terminated with 422', async () => {
                const response = await send('post', '/api/subscribers', sipBody('winvalid', {primary_number: wNumber('120'), status: 'terminated'}))
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                expect(errorPointers(response)).toEqual(['/status'])
            })

            it('reports every failing item of a bulk request', async () => {
                const response = await send('post', '/api/subscribers', [
                    sipBody('winvalid1', {primary_number: wNumber('100')}),
                    sipBody('winvalid2', {primary_number: wNumber('121')}),
                    sipBody('winvalid3', {primary_number: undefined}),
                ])
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                expect(errorPointers(response)).toEqual(['/0/primary_number', '/2/primary_number'])
                expect((await list(`username=winvalid2${suffix}`)).body.total_count).toEqual(0)
            })

            it('rejects a customer of another reseller for reseller with 422', async () => {
                const response = await send('post', '/api/subscribers', sipBody('winvalid', {
                    customer_id: otherCustomerId, primary_number: wNumber('120'),
                }), resellerCreds)
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                expect(errorCodes(response)).toEqual(['SUBSCRIBER_CUSTOMER_INVALID'])
            })

            it('lets ccare create a subscriber of its reseller', async () => {
                await createViaApi('wccare', sipBody('wccare', {primary_number: wNumber('130')}), ccareCreds)
            })

            it('rejects the customer limit with 422', async () => {
                await db.billing.Contract.update(wSipCustomerId, {max_subscribers: 4})
                const response = await send('post', '/api/subscribers', sipBody('winvalid', {primary_number: wNumber('120')}))
                await db.billing.Contract.update(wSipCustomerId, {max_subscribers: null})
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                expect(response.body).toMatchObject({errorCode: 'SUBSCRIBER_LIMIT_REACHED', message: 'Maximum number of customer subscribers reached'})
            })

            it('rejects lintercept with 403', async () => {
                const response = await send('post', '/api/subscribers', sipBody('winvalid', {primary_number: wNumber('120')}), linterceptCreds)
                expect(response.status).toEqual(HttpStatus.FORBIDDEN)
            })

            it('rejects an invalid create_primary_acli with 400', async () => {
                const response = await send('post', '/api/subscribers?create_primary_acli=no', sipBody('winvalid', {primary_number: wNumber('120')}))
                expect(response.status).toEqual(HttpStatus.BAD_REQUEST)
                expect(response.body.errors).toEqual([expect.objectContaining({parameter: 'create_primary_acli'})])
            })

            it('rejects subscriber with 403', async () => {
                const response = await send('post', '/api/subscribers', sipBody('winvalid', {primary_number: wNumber('120')}), wLogin('wsip'))
                expect(response.status).toEqual(HttpStatus.FORBIDDEN)
            })

            it('rejects a subscriberadmin of a SIP customer without the write privilege with 403', async () => {
                const response = await send('post', '/api/subscribers', {username: `winvalid${suffix}`, password: 'x', primary_number: wNumber('120')}, subscriberLogin('sipadmin'))
                expect(response.status).toEqual(HttpStatus.FORBIDDEN)
                expect(response.body.errorCode).toEqual('SUBSCRIBER_READ_ONLY')
            })
        })

        describe('POST PBX', () => {
            it('creates the pilot and a seat in one request, the seat number derived', async () => {
                const response = await send('post', '/api/subscribers', [
                    sipBody('wpilot', {
                        customer_id: wPbxCustomerId,
                        is_pbx_pilot: true,
                        administrative: true,
                        primary_number: wNumber('500'),
                        alias_numbers: [wNumber('501'), wNumber('502'), wNumber('503')],
                    }),
                    sipBody('wseat', {customer_id: wPbxCustomerId, pbx_extension: '101', display_name: 'W Seat'}),
                ])
                expect(response.status).toEqual(HttpStatus.CREATED)
                const [pilot, seat] = response.body.data as SubscriberResponseDto[]
                created.wpilot = pilot.id
                created.wseat = seat.id
                expect(pilot).toMatchObject({is_pbx_pilot: true, is_pbx_group: false, administrative: true, ext_range_min: 100, ext_range_max: 299})
                expect(seat).toMatchObject({is_pbx_pilot: false, pbx_extension: '101', primary_number: wNumber('500101'), pbx_group_ids: []})
            })

            it('creates a group with members in order and a seat in the group', async () => {
                const group = await createViaApi('wgroup', sipBody('wgroup', {
                    customer_id: wPbxCustomerId,
                    is_pbx_group: true,
                    pbx_extension: '200',
                    pbx_hunt_policy: 'serial',
                    pbx_hunt_timeout: 20,
                    pbx_hunt_cancel_mode: 'bye',
                    pbx_groupmember_ids: [created.wseat],
                }))
                expect(group).toMatchObject({primary_number: wNumber('500200'), pbx_groupmember_ids: [created.wseat], pbx_hunt_policy: 'serial'})
                const seat = await createViaApi('wseat2', sipBody('wseat2', {
                    customer_id: wPbxCustomerId, pbx_extension: '102', pbx_group_ids: [created.wgroup],
                }))
                expect(seat.pbx_group_ids).toEqual([created.wgroup])
                expect((await read('wgroup')).pbx_groupmember_ids).toEqual([created.wseat, created.wseat2])
            })

            it.each([
                ['a second pilot', {is_pbx_pilot: true, primary_number: wNumber('510')}, '/is_pbx_pilot', 'SUBSCRIBER_PBX_PILOT_EXISTS'],
                ['a seat without extension', {}, '/pbx_extension', 'SUBSCRIBER_PBX_EXTENSION_REQUIRED'],
                ['an existing extension', {pbx_extension: '101'}, '/pbx_extension', 'SUBSCRIBER_PBX_EXTENSION_EXISTS'],
                ['an extension out of range', {pbx_extension: '300'}, '/pbx_extension', 'SUBSCRIBER_PBX_EXTENSION_RANGE'],
                ['a primary number other than the derived', {pbx_extension: '103', primary_number: wNumber('510')}, '/primary_number', 'SUBSCRIBER_PRIMARY_NUMBER_DERIVED'],
                ['hunt fields on a seat', {pbx_extension: '103', pbx_hunt_policy: 'serial'}, '/pbx_hunt_policy', 'SUBSCRIBER_PBX_FIELD_INVALID'],
                ['an unknown group', {pbx_extension: '103', pbx_group_ids: [-1]}, '/pbx_group_ids/0', 'SUBSCRIBER_PBX_GROUP_INVALID'],
                ['a group member that is a group', {pbx_extension: '201', is_pbx_group: true, pbx_groupmember_ids: [-2]}, '/pbx_groupmember_ids/0', 'SUBSCRIBER_PBX_MEMBER_INVALID'],
            ])('rejects %s with 422', async (_case, values: Record<string, unknown>, pointer, code) => {
                const body = sipBody('winvalid', {customer_id: wPbxCustomerId, ...values})
                if ((values.pbx_groupmember_ids as number[])?.[0] == -2)
                    Object.assign(body, {pbx_groupmember_ids: [created.wgroup]})
                const response = await send('post', '/api/subscribers', body)
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                expect(response.body.errors).toContainEqual(expect.objectContaining({pointer, code}))
            })

            it('lets the pilot create a seat with a number from the pool', async () => {
                const seat = await createViaApi('wseat3', {
                    username: `wseat3${suffix}`, password: 'sipPassword1', webusername: `wwseat3${suffix}`, pbx_extension: '103',
                    alias_numbers: [{...wNumber('501'), is_devid: true}],
                }, wLogin('wpilot'))
                expect(seat).toMatchObject({customer_id: wPbxCustomerId, domain: wdomain, primary_number: wNumber('500103')})
                expect(seat.alias_numbers).toEqual([expect.objectContaining({...wNumber('501'), is_devid: true})])
                expect((await read('wpilot')).alias_numbers.map(n => n.sn)).toEqual([wNumber('502').sn, wNumber('503').sn])
            })

            it.each([
                ['a number outside the pool', {alias_numbers: [wNumber('520')]}, '/alias_numbers/0', 'SUBSCRIBER_NUMBER_NOT_IN_POOL'],
                ['administrative', {administrative: true}, '/administrative', 'SUBSCRIBER_FIELD_READ_ONLY'],
                ['a profile set', (): object => ({profile_set_id: profileSetId}), '/profile_set_id', 'SUBSCRIBER_FIELD_READ_ONLY'],
                ['another customer', (): object => ({customer_id: wSipCustomerId}), '/customer_id', 'SUBSCRIBER_CUSTOMER_INVALID'],
            ])('rejects %s from the pilot with 422', async (_case, values, pointer, code) => {
                const response = await send('post', '/api/subscribers', {
                    username: `winvalid${suffix}`, password: 'sipPassword1', pbx_extension: '104',
                    ...typeof values == 'function' ? values() : values,
                }, wLogin('wpilot'))
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                expect(response.body.errors).toContainEqual(expect.objectContaining({pointer, code}))
            })
        })

        describe('PUT and PATCH', () => {
            const patch = (name: string, ops: object[], user: Login = creds): request.Test =>
                send('patch', `/api/subscribers/${created[name]}`, ops, user)

            it('patches fields and writes a journal entry', async () => {
                const response = await patch('wsip', [
                    {op: 'replace', path: '/display_name', value: 'W Sip 2'},
                    {op: 'replace', path: '/status', value: 'locked'},
                    {op: 'remove', path: '/timezone'},
                ])
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body).toMatchObject({display_name: 'W Sip 2', status: 'locked', lock: '4', timezone: null, email: `${prefix}-wsip@example.org`})
                const journal = await get(`/api/subscribers/${created.wsip}/journal`)
                expect(journal.body.total_count).toEqual(2)
            })

            it('keeps the lock when unlocking without a lock level', async () => {
                const response = await patch('wsip', [{op: 'replace', path: '/status', value: 'active'}])
                expect(response.body).toMatchObject({status: 'active', lock: '4'})
            })

            it('takes a given lock level when locking', async () => {
                const response = await patch('wbulk1', [
                    {op: 'replace', path: '/status', value: 'locked'},
                    {op: 'replace', path: '/lock', value: 3},
                ])
                expect(response.body).toMatchObject({status: 'locked', lock: '3'})
                const unlocked = await patch('wbulk1', [{op: 'replace', path: '/status', value: 'active'}, {op: 'replace', path: '/lock', value: 0}])
                expect(unlocked.body).toMatchObject({status: 'active', lock: null})
            })

            it('replaces with PUT: omitted fields are reset, aliases released', async () => {
                const response = await send('put', `/api/subscribers/${created.wsip}`, sipBody('wsip', {primary_number: wNumber('100')}))
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body).toMatchObject({
                    status: 'active', lock: null, email: null, display_name: null, external_id: null, alias_numbers: [],
                    profile_set_id: null, profile_id: null,
                })
                const released = await db.billing.VoipNumber.findOneByOrFail({cc: 43, ac: '98', sn: wNumber('101').sn})
                expect(released.subscriber_id).toBeNull()
            })

            it('claims a released number for another subscriber', async () => {
                const response = await patch('wbulk1', [{op: 'add', path: '/alias_numbers/-', value: wNumber('101')}])
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.alias_numbers).toEqual([expect.objectContaining(wNumber('101'))])
            })

            it.each([
                ['username', {op: 'replace', path: '/username', value: 'changed'}, '/username', 'SUBSCRIBER_FIELD_IMMUTABLE'],
                ['customer_id', {op: 'replace', path: '/customer_id', value: 1}, '/customer_id', 'SUBSCRIBER_FIELD_IMMUTABLE'],
                ['is_pbx_pilot', {op: 'replace', path: '/is_pbx_pilot', value: true}, '/is_pbx_pilot', 'SUBSCRIBER_FIELD_IMMUTABLE'],
                ['status terminated', {op: 'replace', path: '/status', value: 'terminated'}, '/status', 'isIn'],
                ['a number in use', {op: 'replace', path: '/primary_number', value: wNumber('110')}, '/primary_number', 'SUBSCRIBER_NUMBER_IN_USE'],
            ])('rejects a change of %s with 422', async (_case, op, pointer, code) => {
                const response = await patch('wsip', [op])
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                expect(response.body.errors).toContainEqual(expect.objectContaining({pointer, code}))
            })

            it('changes the profile within the set', async () => {
                const response = await patch('wbulk2', [
                    {op: 'replace', path: '/profile_set_id', value: profileSetId},
                    {op: 'replace', path: '/profile_id', value: otherProfileId},
                ])
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body).toMatchObject({profile_set_id: profileSetId, profile_id: otherProfileId})
            })

            it('reports every failing item of a bulk PATCH and writes nothing', async () => {
                const response = await send('patch', '/api/subscribers', {
                    [created.wbulk1]: [{op: 'replace', path: '/display_name', value: 'never'}],
                    [created.wbulk2]: [{op: 'replace', path: '/username', value: 'changed'}],
                    [created.wccare]: [{op: 'replace', path: '/primary_number', value: wNumber('100')}],
                })
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                expect(errorPointers(response)).toEqual([`/${created.wbulk2}/username`, `/${created.wccare}/primary_number`])
                expect((await read('wbulk1')).display_name).toBeNull()
            })

            it('updates in bulk with PUT and writes a journal entry per subscriber', async () => {
                const response = await send('put', '/api/subscribers', {
                    [created.wbulk1]: sipBody('wbulk1', {primary_number: wNumber('110'), display_name: 'B1'}),
                    [created.wbulk2]: sipBody('wbulk2', {primary_number: wNumber('111'), display_name: 'B2'}),
                })
                expect(response.status).toEqual(HttpStatus.OK)
                expect((await read('wbulk1')).display_name).toEqual('B1')
                expect((await read('wbulk2')).display_name).toEqual('B2')
                expect((await get(`/api/subscribers/${created.wbulk2}/journal`)).body.total_count).toEqual(3)
            })

            it('returns 404 for a subscriber outside the scope', async () => {
                const response = await send('patch', `/api/subscribers/${subscribers.other.id}`, [{op: 'replace', path: '/display_name', value: 'x'}], resellerCreds)
                expect(response.status).toEqual(HttpStatus.NOT_FOUND)
            })

            describe('subscriberadmin', () => {
                it.each([
                    ['administrative', {op: 'replace', path: '/administrative', value: true}],
                    ['external_id', {op: 'replace', path: '/external_id', value: 'x'}],
                    ['profile_id', (): object => ({op: 'replace', path: '/profile_id', value: otherProfileId})],
                ])('rejects a change of %s on a seat with 422', async (field, op) => {
                    const response = await patch('wseat', [typeof op == 'function' ? op() : op], wLogin('wpilot'))
                    expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                    expect(response.body.errors).toEqual([expect.objectContaining({pointer: `/${field}`, code: 'SUBSCRIBER_FIELD_READ_ONLY'})])
                })

                it.each([
                    ['status', {op: 'replace', path: '/status', value: 'locked'}],
                    ['alias_numbers', {op: 'remove', path: '/alias_numbers/0'}],
                ])('rejects a change of %s on itself with 422', async (field, op) => {
                    const response = await patch('wpilot', [op], wLogin('wpilot'))
                    expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                    expect(errorPointers(response)).toEqual([`/${field}`])
                })

                it('passes unchanged read-only fields and changes its own display name', async () => {
                    const response = await patch('wpilot', [
                        {op: 'replace', path: '/status', value: 'active'},
                        {op: 'replace', path: '/display_name', value: 'Pilot'},
                    ], wLogin('wpilot'))
                    expect(response.status).toEqual(HttpStatus.OK)
                    expect(response.body.display_name).toEqual('Pilot')
                })

                it('assigns a pool number to a seat and revokes it back to the pilot', async () => {
                    const assigned = await patch('wseat', [{op: 'add', path: '/alias_numbers/-', value: wNumber('502')}], wLogin('wpilot'))
                    expect(assigned.status).toEqual(HttpStatus.OK)
                    expect(assigned.body.alias_numbers).toEqual([expect.objectContaining(wNumber('502'))])
                    expect((await read('wpilot')).alias_numbers.map(n => n.sn)).toEqual([wNumber('503').sn])
                    const revoked = await patch('wseat', [{op: 'remove', path: '/alias_numbers/0'}], wLogin('wpilot'))
                    expect(revoked.body.alias_numbers).toEqual([])
                    expect((await read('wpilot')).alias_numbers.map(n => n.sn).sort()).toEqual([wNumber('502').sn, wNumber('503').sn])
                })

                it('rejects another seat\'s number with 422', async () => {
                    const response = await patch('wseat', [{op: 'add', path: '/alias_numbers/-', value: wNumber('501')}], wLogin('wpilot'))
                    expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                    expect(response.body.errors).toEqual([expect.objectContaining({pointer: '/alias_numbers/0', code: 'SUBSCRIBER_NUMBER_NOT_IN_POOL'})])
                })

                it('changes the groups of a seat', async () => {
                    const response = await patch('wseat', [{op: 'replace', path: '/pbx_group_ids', value: []}], wLogin('wpilot'))
                    expect(response.body.pbx_group_ids).toEqual([])
                    expect((await read('wgroup')).pbx_groupmember_ids).toEqual([created.wseat2])
                })

                it('renumbers the seat with its extension', async () => {
                    const response = await patch('wseat', [{op: 'replace', path: '/pbx_extension', value: '110'}], wLogin('wpilot'))
                    expect(response.status).toEqual(HttpStatus.OK)
                    expect(response.body.primary_number).toMatchObject(wNumber('500110'))
                })
            })

            describe('subscriber', () => {
                it.each([
                    ['pbx_extension', {op: 'replace', path: '/pbx_extension', value: '111'}],
                    ['pbx_group_ids', {op: 'replace', path: '/pbx_group_ids', value: []}],
                    ['lock', {op: 'replace', path: '/lock', value: 1}],
                ])('rejects a change of %s with 422', async (field, op) => {
                    const response = await patch('wseat2', [op], wLogin('wseat2'))
                    expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                    expect(errorPointers(response)).toEqual([`/${field}`])
                })

                it('changes its web password, a reused one is rejected with 422', async () => {
                    const change = await patch('wseat2', [{op: 'add', path: '/webpassword', value: strongPassword}], wLogin('wseat2'))
                    expect(change.status).toEqual(HttpStatus.OK)
                    expect(change.body).not.toHaveProperty('webpassword')
                    const reuse = await patch('wseat2', [{op: 'add', path: '/webpassword', value: strongPassword}], wLogin('wseat2'))
                    expect(reuse.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                    expect(reuse.body.errors).toEqual([expect.objectContaining({pointer: '/webpassword', code: 'PASSWORD_ALREADY_USED'})])
                })

                it('returns 404 for another subscriber', async () => {
                    const response = await patch('wseat', [{op: 'replace', path: '/display_name', value: 'x'}], wLogin('wseat2'))
                    expect(response.status).toEqual(HttpStatus.NOT_FOUND)
                })
            })

            it('renumbers the seats and groups when the pilot number changes', async () => {
                const response = await patch('wpilot', [{op: 'replace', path: '/primary_number', value: wNumber('600')}])
                expect(response.status).toEqual(HttpStatus.OK)
                expect((await read('wseat')).primary_number).toMatchObject(wNumber('600110'))
                expect((await read('wgroup')).primary_number).toMatchObject(wNumber('600200'))
                const old = await db.billing.VoipNumber.findOneByOrFail({cc: 43, ac: '98', sn: wNumber('500110').sn})
                expect(old.subscriber_id).toBeNull()
            })
        })

        describe('DELETE', () => {
            const del = (ids: number | number[], user: Login = creds): request.Test => {
                const req = request(app.getHttpServer())
                    .delete(Array.isArray(ids) ? '/api/subscribers' : `/api/subscribers/${ids}`)
                    .auth(user.username, user.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                const withRealm = user.realm ? req.set('X-Auth-Realm', user.realm) : req
                return Array.isArray(ids) ? withRealm.send(ids) : withRealm
            }

            const pbxBody = (name: string, values: object = {}): object => sipBody(name, {customer_id: tPbxCustomerId, ...values})

            const provisioningRow = async (name: string): Promise<db.provisioning.VoipSubscriber | null> => {
                const billing = await db.billing.VoipSubscriber.findOneByOrFail({id: created[name]})
                return await db.provisioning.VoipSubscriber.findOneBy({uuid: billing.uuid})
            }

            const numberOwner = async (sn: string): Promise<number | null> =>
                (await db.billing.VoipNumber.findOneByOrFail({cc: 43, ac: '98', sn: wNumber(sn).sn})).subscriber_id ?? null

            const aor = (name: string): string => `${name}${suffix}@${wdomain}`

            it('sets up a PBX customer with pilot, seats, a group and SIP subscribers', async () => {
                tPbxCustomerId = await createContract(PBXACCOUNT_PRODUCT_ID, customerContactId)
                const response = await send('post', '/api/subscribers', [
                    pbxBody('tpilot', {is_pbx_pilot: true, administrative: true, primary_number: wNumber('800'), alias_numbers: [wNumber('801'), wNumber('802'), wNumber('803')]}),
                    pbxBody('tseat', {pbx_extension: '11'}),
                    pbxBody('tseat2', {pbx_extension: '12', administrative: true}),
                ])
                expect(response.status).toEqual(HttpStatus.CREATED)
                const [pilot, seat, seat2] = response.body.data as SubscriberResponseDto[]
                Object.assign(created, {tpilot: pilot.id, tseat: seat.id, tseat2: seat2.id})
                await createViaApi('tgroup', pbxBody('tgroup', {
                    is_pbx_group: true, pbx_extension: '20', pbx_hunt_policy: 'serial', pbx_groupmember_ids: [seat.id, seat2.id],
                }))
                const assigned = await send('patch', `/api/subscribers/${seat.id}`, [
                    {op: 'add', path: '/alias_numbers/-', value: {...wNumber('801'), is_devid: true}},
                    {op: 'add', path: '/alias_numbers/-', value: wNumber('802')},
                ], wLogin('tpilot'))
                expect(assigned.status).toEqual(HttpStatus.OK)
                const attribute = await db.provisioning.VoipPreference.findOneByOrFail({attribute: 'allowed_ips_grp'})
                await db.provisioning.VoipUsrPreference.insert({subscriber_id: (await provisioningRow('tseat')).id, attribute_id: attribute.id, value: `${ipGroupId}`})
                await db.provisioning.VoipAllowedIpGroup.insert({group_id: ipGroupId, ipnet: '192.0.2.0/24'})
                for (const [index, name] of ['tsip1', 'tsip2', 'tsip3'].entries())
                    await createViaApi(name, sipBody(name, {primary_number: wNumber(`81${index}`)}))
            })

            it('rejects subscriber and lintercept with 403', async () => {
                expect((await del(created.tsip1, wLogin('tseat'))).status).toEqual(HttpStatus.FORBIDDEN)
                expect((await del(created.tsip1, linterceptCreds)).status).toEqual(HttpStatus.FORBIDDEN)
            })

            it('rejects a subscriberadmin of a SIP customer without the write privilege with 403', async () => {
                const response = await del(subscribers.sipuser.id, subscriberLogin('sipadmin'))
                expect(response.status).toEqual(HttpStatus.FORBIDDEN)
                expect(response.body.errorCode).toEqual('SUBSCRIBER_READ_ONLY')
            })

            it('returns 404 for a subscriber outside the scope', async () => {
                expect((await del(subscribers.other.id, resellerCreds)).status).toEqual(HttpStatus.NOT_FOUND)
                expect((await del(created.tseat, subscriberLogin('sipadmin'))).status).toEqual(HttpStatus.NOT_FOUND)
            })

            it.each([
                ['admin', 'tsip1', '810', (): Login => creds],
                ['reseller', 'tsip2', '811', (): Login => resellerCreds],
                ['ccare', 'tsip3', '812', (): Login => ccareCreds],
            ])('%s terminates a SIP subscriber', async (_role, name, sn, login) => {
                const before = redisMock.removedLocations.length
                const response = await del(created[name], login())
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.data).toEqual([created[name]])
                expect((await db.billing.VoipSubscriber.findOneByOrFail({id: created[name]})).status).toEqual(VoipSubscriberStatus.Terminated)
                expect(await provisioningRow(name)).toBeNull()
                expect(await numberOwner(sn)).toBeNull()
                expect(redisMock.removedLocations.slice(before)).toEqual([[aor(name)]])
                expect((await get(`/api/subscribers/${created[name]}`)).status).toEqual(HttpStatus.NOT_FOUND)
                expect((await list('')).body.data.map((s: SubscriberResponseDto) => s.id)).not.toContain(created[name])
                expect(await db.billing.Journal.countBy({resource_name: 'subscribers', resource_id: created[name], operation: 'delete'})).toEqual(1)
            })

            it('returns 404 on DELETE and PATCH of a terminated subscriber', async () => {
                expect((await del(created.tsip1)).status).toEqual(HttpStatus.NOT_FOUND)
                const patched = await send('patch', `/api/subscribers/${created.tsip1}`, [{op: 'replace', path: '/display_name', value: 'x'}])
                expect(patched.status).toEqual(HttpStatus.NOT_FOUND)
            })

            it.each([
                ['itself', 'tseat2', 'SUBSCRIBER_TERMINATE_SELF'],
                ['the pilot', 'tpilot', 'SUBSCRIBER_TERMINATE_PILOT'],
            ])('rejects a subscriberadmin terminating %s with 403', async (_case, name, code) => {
                const response = await del(created[name], wLogin('tseat2'))
                expect(response.status).toEqual(HttpStatus.FORBIDDEN)
                expect(response.body.errors).toEqual([expect.objectContaining({code})])
            })

            it('rejects the pilot with other subscribers with 422', async () => {
                const response = await del(created.tpilot)
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                expect(response.body.errors).toEqual([expect.objectContaining({code: 'SUBSCRIBER_PBX_PILOT_HAS_SUBSCRIBERS'})])
            })

            it('lets the pilot terminate a seat: aliases back to the pilot, groups and allowed IPs cleaned up', async () => {
                const before = redisMock.trustedHostsReloads
                const response = await del(created.tseat, wLogin('tpilot'))
                expect(response.status).toEqual(HttpStatus.OK)
                expect(await numberOwner('80011')).toBeNull()
                expect(await numberOwner('801')).toEqual(created.tpilot)
                expect(await numberOwner('802')).toEqual(created.tpilot)
                const pilot = await read('tpilot')
                expect(pilot.alias_numbers.map(n => [n.sn, n.is_devid]).sort()).toEqual([
                    [wNumber('801').sn, false],
                    [wNumber('802').sn, false],
                    [wNumber('803').sn, false],
                ])
                expect((await read('tgroup')).pbx_groupmember_ids).toEqual([created.tseat2])
                const huntGroup = await db.provisioning.VoipPreference.findOneByOrFail({attribute: 'cloud_pbx_hunt_group'})
                const group = await provisioningRow('tgroup')
                const huntPreferences = await db.provisioning.VoipUsrPreference.findBy({subscriber_id: group.id, attribute_id: huntGroup.id})
                expect(huntPreferences.map(p => p.value)).toEqual([`sip:${aor('tseat2')}`])
                expect(await db.provisioning.VoipAllowedIpGroup.countBy({group_id: ipGroupId})).toEqual(0)
                expect(redisMock.removedLocations.at(-1)).toEqual([aor('tseat'), `${wNumber('801').cc}${wNumber('801').ac}${wNumber('801').sn}@${wdomain}`])
                expect(redisMock.trustedHostsReloads).toEqual(before + 1)
            })

            it('reports unknown ids of a bulk DELETE with 422 per id and terminates nothing', async () => {
                const response = await del([created.tseat2, 999999999])
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                expect(response.body.errors).toEqual([expect.objectContaining({pointer: '/1', code: 'SUBSCRIBER_NOT_FOUND'})])
                expect((await get(`/api/subscribers/${created.tseat2}`)).status).toEqual(HttpStatus.OK)
            })

            it('terminates the pilot after its group and seat in one request', async () => {
                const before = redisMock.trustedHostsReloads
                const locations = redisMock.removedLocations.length
                const ids = [created.tgroup, created.tseat2, created.tpilot]
                const group = await provisioningRow('tgroup')
                const response = await del(ids)
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.data).toEqual(ids)
                for (const id of ids)
                    expect((await get(`/api/subscribers/${id}`)).status).toEqual(HttpStatus.NOT_FOUND)
                for (const sn of ['800', '801', '802', '803', '80012', '80020'])
                    expect(await numberOwner(sn)).toBeNull()
                expect(await db.provisioning.VoipPbxGroup.countBy({group_id: group.id})).toEqual(0)
                expect(redisMock.removedLocations.slice(locations)).toEqual([[aor('tgroup'), aor('tseat2'), aor('tpilot')]])
                expect(redisMock.trustedHostsReloads).toEqual(before + 1)
                expect(await db.billing.Journal.countBy({resource_name: 'subscribers', resource_id: In(ids), operation: 'delete'})).toEqual(3)
            })
        })
    })

    describe('Subscriber DELETE', () => {
        it('delete write fixtures', async () => {
            const createdIds = Object.values(created)
            if (createdIds.length) {
                const rows = await db.billing.VoipSubscriber.find({where: {id: In(createdIds)}})
                const provisioning = await db.provisioning.VoipSubscriber.find({where: {uuid: In(rows.map(row => row.uuid))}})
                const provisioningIds = provisioning.map(row => row.id)
                if (provisioningIds.length) {
                    await db.provisioning.VoipUsrPreference.delete({subscriber_id: In(provisioningIds)})
                    await db.provisioning.VoipDBAlias.delete({subscriber_id: In(provisioningIds)})
                    await appService.db.query(
                        'DELETE FROM provisioning.voip_pbx_groups WHERE group_id IN (?) OR subscriber_id IN (?)', [provisioningIds, provisioningIds],
                    )
                    await db.provisioning.VoipSubscriber.delete(provisioningIds)
                }
                await db.kamailio.VoicemailUser.delete({customer_id: In(rows.map(row => row.uuid))})
                await db.billing.Journal.delete({resource_name: 'subscribers', resource_id: In(createdIds)})
                await db.billing.VoipSubscriber.update({id: In(createdIds)}, {contact_id: null, primary_number_id: null})
                const contactIds = rows.map(row => row.contact_id).filter(id => id != null)
                if (contactIds.length)
                    await db.billing.Contact.delete(contactIds)
            }
            await db.provisioning.VoipAllowedIpGroup.delete({group_id: ipGroupId})
            await appService.db.query('DELETE FROM billing.voip_numbers WHERE cc = 43 AND ac = ? AND sn LIKE ?', ['98', `${snBase}%`])
            if (profileSetId)
                await db.provisioning.VoipSubscriberProfileSet.delete([profileSetId, otherResellerProfileSetId])
        })

        it('delete fixtures', async () => {
            const provisioningIds = Object.values(subscribers).map(s => s.provisioningId)
            if (provisioningIds.length) {
                await db.provisioning.VoipUsrPreference.delete({subscriber_id: In(provisioningIds)})
                await db.provisioning.VoipDBAlias.delete({subscriber_id: In(provisioningIds)})
                await appService.db.query(
                    'DELETE FROM provisioning.voip_pbx_groups WHERE group_id IN (?) OR subscriber_id IN (?)', [provisioningIds, provisioningIds],
                )
                await db.provisioning.VoipSubscriber.delete(provisioningIds)
            }
            if (createdContractIds.length)
                await db.provisioning.VoipContractPreference.delete({contract_id: In(createdContractIds)})
            if (createdNumberIds.length)
                await db.billing.VoipNumber.delete(createdNumberIds)
            // the billing subscribers are deleted with their contracts
            const customerContractIds = createdContractIds.filter(id => id != otherResellerContractId)
            if (customerContractIds.length)
                await db.billing.Contract.delete(customerContractIds)
            if (createdContactIds.length)
                await db.billing.Contact.delete(createdContactIds)
            if (otherResellerId)
                await db.billing.Reseller.delete(otherResellerId)
            if (otherResellerContractId)
                await db.billing.Contract.delete(otherResellerContractId)
            if (billingDomainId)
                await db.billing.Domain.delete(billingDomainId)
            if (provisioningDomainId)
                await db.provisioning.VoipDomain.delete(provisioningDomainId)
            if (wBillingDomainId)
                await db.billing.Domain.delete([wBillingDomainId, otherDomainId])
            if (wProvisioningDomainId)
                await db.provisioning.VoipDomain.delete([wProvisioningDomainId, otherProvisioningDomainId])
        })

        it('delete mock admins', async () => {
            await db.billing.Admin.delete({login: In([creds.username, resellerCreds.username, ccareCreds.username, linterceptCreds.username])})
        })
    })
})
