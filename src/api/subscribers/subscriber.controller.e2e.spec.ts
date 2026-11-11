import {randomUUID} from 'crypto'

import {ClassSerializerInterceptor, HttpStatus, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {In} from 'typeorm'

import {SubscriberResponseDto} from './dto/subscriber-response.dto'
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

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [SubscriberModule, AppModule],
        }).compile()

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
    })

    describe('Subscriber DELETE', () => {
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
        })

        it('delete mock admins', async () => {
            await db.billing.Admin.delete({login: In([creds.username, resellerCreds.username, ccareCreds.username, linterceptCreds.username])})
        })
    })
})
