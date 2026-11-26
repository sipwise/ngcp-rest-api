import {randomUUID} from 'crypto'

import {HttpStatus, INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'
import {In} from 'typeorm'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {setupApp} from '~/app.setup'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {
    HeaderRuleConditionExpression,
    HeaderRuleConditionMatchPart,
    HeaderRuleConditionMatchType,
    HeaderRuleConditionValueType,
} from '~/entities/internal/header-rule-condition.internal.entity'
import {HeaderRuleDirection} from '~/entities/internal/header-rule.internal.entity'
import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'
import {VoipSubscriberStatus} from '~/entities/internal/voip-subscriber.internal.entity'

const RESELLER_ID = 1
const RESELLER_PRODUCT_ID = 3
const SIPACCOUNT_PRODUCT_ID = 4
const PBXACCOUNT_PRODUCT_ID = 5
const SYSTEM_CONTACT_ID = 2
const BILLING_PROFILE_ID = 1
// above the default inline_max_items (1000)
const BIG_ALIAS_COUNT = 2500
const INSERT_CHUNK = 500

interface Login {
    username: string
    password: string
}

interface ErrorEntry {
    parameter?: string
    code: string
    message?: string
}

describe('Lazy fields', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    const worker = process.env.JEST_WORKER_ID
    const suffix = `${worker}${Date.now()}`
    const prefix = `e2e-lazy-${suffix}`
    const domain = `${prefix}.example.org`
    // unique number block of the run, 43 98 <sn>
    const snBase = `${worker}${String(Date.now()).slice(-8)}`
    const creds: Login = {username: `mockAdminUser${worker}`, password: 'mockAdminPass'}
    const resellerCreds: Login = {username: `mockResellerUser${worker}`, password: 'mockAdminPass'}
    const contractIds: number[] = []
    const contactIds: number[] = []
    const subscribers: Record<string, {id: number, provisioningId: number}> = {}
    const customers: Record<string, number> = {}
    let bigNumberIds: number[] = []
    let otherResellerId: number
    let otherResellerContractId: number
    let billingDomainId: number
    let provisioningDomainId: number
    // header manipulation set of subscriber 'small' with one condition and its values
    let headerSetId: number
    let conditionId: number

    const insertAdmin = async (login: string, role: RbacRole): Promise<void> => {
        await db.billing.Admin.delete({login})
        const aclRole = await db.billing.AclRole.findOneByOrFail({role})
        await db.billing.Admin.insert({
            reseller_id: RESELLER_ID,
            login,
            saltedpass: 'mockAdminSaltedpass',
            saltedpass_modify_timestamp: new Date(),
            role_id: aclRole.id,
            is_master: true,
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
        })
    }

    const createContact = async (name: string, resellerId: number): Promise<number> => {
        const contact = await db.billing.Contact.create({
            reseller_id: resellerId,
            email: `${prefix}-${name}@example.org`,
            create_timestamp: new Date(),
        }).save()
        contactIds.push(contact.id)
        return contact.id
    }

    const createContract = async (productId: number, contactId: number): Promise<number> => {
        const contract = await db.billing.Contract.create({
            contact_id: contactId,
            product_id: productId,
            status: ContractStatus.Active,
            create_timestamp: new Date(),
            modify_timestamp: new Date(),
        }).save()
        contractIds.push(contract.id)
        if (productId != RESELLER_PRODUCT_ID)
            await appService.db.query('call billing.schedule_contract_billing_profile_network(?,?,?)', [contract.id, null, `,,${BILLING_PROFILE_ID},,;`])
        return contract.id
    }

    const createSubscriber = async (
        name: string,
        contractId: number,
        provisioning: Partial<db.provisioning.VoipSubscriber> = {},
    ): Promise<void> => {
        const uuid = randomUUID()
        const username = `${name}${suffix}`
        const result = await db.billing.VoipSubscriber.insert({
            contract_id: contractId,
            uuid,
            username,
            domain_id: billingDomainId,
            status: VoipSubscriberStatus.Active,
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
        }
    }

    // numbers of a subscriber with sn <snBase><first + i>, inserted in chunks; returns their ids in order
    const addNumbers = async (name: string, first: number, count: number): Promise<number[]> => {
        const ids: number[] = []
        for (let start = 0; start < count; start += INSERT_CHUNK) {
            const rows = []
            for (let i = start; i < Math.min(start + INSERT_CHUNK, count); i++)
                rows.push({cc: 43, ac: '98', sn: `${snBase}${first + i}`, reseller_id: RESELLER_ID, subscriber_id: subscribers[name].id})
            const result = await db.billing.VoipNumber.insert(rows)
            ids.push(...result.identifiers.map(identifier => (identifier as {id: number}).id))
        }
        return ids
    }

    const get = (url: string, user: Login = creds, accept = 'application/json'): request.Test => request(app.getHttpServer())
        .get(url)
        .auth(user.username, user.password)
        .set('Accept', accept)

    const errors = (response: request.Response): ErrorEntry[] =>
        (response.body.errors as ErrorEntry[]).map(({parameter, code}) => ({parameter, code}))

    const link = (url: string, count: number): object => ({type: 'link', url, total_count: count})

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        }).compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        app = moduleRef.createNestApplication()

        app.setGlobalPrefix('api')
        setupApp(app)

        await app.init()

        await insertAdmin(creds.username, RbacRole.admin)
        await insertAdmin(resellerCreds.username, RbacRole.reseller)

        otherResellerContractId = await createContract(RESELLER_PRODUCT_ID, SYSTEM_CONTACT_ID)
        otherResellerId = (await db.billing.Reseller.create({
            contract_id: otherResellerContractId,
            name: prefix,
            status: ResellerStatus.Active,
        }).save()).id
        billingDomainId = (await db.billing.Domain.create({domain, reseller_id: RESELLER_ID}).save()).id
        provisioningDomainId = (await db.provisioning.VoipDomain.create({domain}).save()).id

        const contactId = await createContact('own', RESELLER_ID)
        customers.sip = await createContract(SIPACCOUNT_PRODUCT_ID, contactId)
        customers.pbx = await createContract(PBXACCOUNT_PRODUCT_ID, contactId)
        customers.other = await createContract(SIPACCOUNT_PRODUCT_ID, await createContact('other', otherResellerId))

        await createSubscriber('big', customers.sip)
        await createSubscriber('small', customers.sip)
        await createSubscriber('other', customers.other)
        await createSubscriber('seat', customers.pbx, {pbx_extension: '101'})
        await createSubscriber('group', customers.pbx, {
            is_pbx_group: true, pbx_extension: '200', pbx_hunt_policy: 'serial', pbx_hunt_timeout: 10, pbx_hunt_cancel_mode: 'bye',
        })
        bigNumberIds = await addNumbers('big', 10000, BIG_ALIAS_COUNT)
        await addNumbers('small', 20000, 2)
        await addNumbers('other', 30000, 1)
        // pbx seats and groups have a primary number
        for (const [name, sn] of [['seat', 40101], ['group', 40200]] as const) {
            const [numberId] = await addNumbers(name, sn, 1)
            await db.billing.VoipSubscriber.update(subscribers[name].id, {primary_number_id: numberId})
        }
        await db.provisioning.VoipPbxGroup.insert({group_id: subscribers.group.provisioningId, subscriber_id: subscribers.seat.provisioningId})

        headerSetId = (await db.provisioning.VoipHeaderRuleSet.insert({
            reseller_id: RESELLER_ID, subscriber_id: subscribers.small.provisioningId, name: prefix,
        })).identifiers[0].id as number
        const ruleId = (await db.provisioning.VoipHeaderRule.insert({
            set_id: headerSetId, name: prefix, priority: 100, direction: HeaderRuleDirection.AInbound, stopper: false, enabled: true,
        })).identifiers[0].id as number
        conditionId = (await db.provisioning.VoipHeaderRuleCondition.insert({
            rule_id: ruleId,
            match_type: HeaderRuleConditionMatchType.Header,
            match_part: HeaderRuleConditionMatchPart.Full,
            match_name: 'X-Lazy',
            expression: HeaderRuleConditionExpression.Is,
            expression_negation: false,
            value_type: HeaderRuleConditionValueType.Input,
            enabled: true,
        })).identifiers[0].id as number
        await db.provisioning.VoipHeaderRuleConditionValue.insert(['foo', 'bar', 'baz'].map(value => ({condition_id: conditionId, value})))
    })

    afterAll(async () => {
        if (appService.db.isInitialized)
            await appService.db.destroy()
        await app.close()
    })

    describe('', () => { // main tests block
        it('mock authService.compareBcryptPassword', async () => {
            jest.spyOn(authService, 'compareBcryptPassword').mockImplementation(() => Promise.resolve(true))
            expect(await authService.compareBcryptPassword('123', '456')).toBe(true)
        })

        describe('links', () => {
            it('links every lazy field of an item to its @<field> collection with its count', async () => {
                const subscriber = await get(`/api/subscribers/${subscribers.big.id}`)
                expect(subscriber.status).toEqual(HttpStatus.OK)
                expect(subscriber.body.alias_numbers).toEqual(link(`/api/subscribers/${subscribers.big.id}/@alias_numbers`, BIG_ALIAS_COUNT))
                const customer = await get(`/api/customers/${customers.sip}`)
                expect(customer.body.billing_profiles).toEqual(link(`/api/customers/${customers.sip}/@billing_profiles`, 1))
                expect(customer.body.future_billing_profiles).toEqual(link(`/api/customers/${customers.sip}/@future_billing_profiles`, 0))
            })

            it('links the fields of every listed item with their own urls and counts', async () => {
                const response = await get(`/api/subscribers?id=${subscribers.big.id},${subscribers.small.id}&order_by=id`)
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.data.map((item: {alias_numbers: object}) => item.alias_numbers)).toEqual([
                    link(`/api/subscribers/${subscribers.big.id}/@alias_numbers`, BIG_ALIAS_COUNT),
                    link(`/api/subscribers/${subscribers.small.id}/@alias_numbers`, 2),
                ])
            })

            it('keeps the link objects in HAL', async () => {
                const response = await get(`/api/subscribers/${subscribers.small.id}`, creds, 'application/hal+json')
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.alias_numbers).toEqual(link(`/api/subscribers/${subscribers.small.id}/@alias_numbers`, 2))
            })
        })

        describe('inline', () => {
            it('returns a named field as data', async () => {
                const response = await get(`/api/subscribers/${subscribers.small.id}?inline=alias_numbers`)
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.alias_numbers.map((number: {sn: string}) => number.sn)).toEqual([`${snBase}20000`, `${snBase}20001`])
            })

            it('rejects a named field above inline_max_items with 422 naming its collection', async () => {
                for (const inline of ['alias_numbers', 'all']) {
                    const response = await get(`/api/subscribers/${subscribers.big.id}?inline=${inline}`)
                    expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                    expect(errors(response)).toEqual([{parameter: 'inline', code: 'INLINE_TOO_LARGE'}])
                    expect(response.body.errors[0].message).toContain(`/api/subscribers/${subscribers.big.id}/@alias_numbers`)
                }
                const list = await get(`/api/subscribers?id=${subscribers.big.id},${subscribers.small.id}&inline=all`)
                expect(list.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
            })

            it('auto inlines per item what is within inline_max_items and links the rest', async () => {
                const response = await get(`/api/subscribers?id=${subscribers.big.id},${subscribers.small.id}&order_by=id&inline=auto`)
                expect(response.status).toEqual(HttpStatus.OK)
                const [big, small] = response.body.data
                expect(big.alias_numbers).toEqual(link(`/api/subscribers/${subscribers.big.id}/@alias_numbers`, BIG_ALIAS_COUNT))
                expect(small.alias_numbers).toHaveLength(2)
            })

            it('takes the cap from performance.lazy_load.inline_max_items', async () => {
                const config = AppService.config.performance
                AppService.config.performance = {...config, lazy_load: {inline_max_items: 1}}
                try {
                    const auto = await get(`/api/subscribers/${subscribers.small.id}?inline=auto`)
                    expect(auto.body.alias_numbers).toEqual(link(`/api/subscribers/${subscribers.small.id}/@alias_numbers`, 2))
                    const named = await get(`/api/subscribers/${subscribers.small.id}?inline=alias_numbers`)
                    expect(named.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                } finally {
                    AppService.config.performance = config
                }
            })

            describe('performance.lazy_load.inline_max_hard_limit', () => {
                const config = AppService.config.performance
                // small 2 + other 1 alias numbers
                const list = (): string => `/api/subscribers?id=${subscribers.small.id},${subscribers.other.id}&order_by=id`

                const withHardLimit = async (hardLimit: number, test: () => Promise<void>): Promise<void> => {
                    AppService.config.performance = {...config, lazy_load: {inline_max_items: 2, inline_max_hard_limit: hardLimit}}
                    try {
                        await test()
                    } finally {
                        AppService.config.performance = config
                    }
                }

                it('inlines named fields up to the limit of the whole response', async () => withHardLimit(3, async () => {
                    const response = await get(`${list()}&inline=alias_numbers`)
                    expect(response.status).toEqual(HttpStatus.OK)
                    expect(response.body.data.map((item: {alias_numbers: unknown[]}) => item.alias_numbers.length)).toEqual([2, 1])
                }))

                it('rejects named fields and all above it with 422 naming the limit', async () => withHardLimit(2, async () => {
                    for (const inline of ['alias_numbers', 'all']) {
                        const response = await get(`${list()}&inline=${inline}`)
                        expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                        expect(errors(response)).toEqual([{parameter: 'inline', code: 'INLINE_TOO_LARGE'}])
                        expect(response.body.errors[0].message).toContain('3 items are more than the 2 allowed per response')
                        expect(response.body.errors[0].message).toContain(`/api/subscribers/${subscribers.small.id}/@alias_numbers`)
                    }
                }))

                it('auto inlines in page order while the response stays within it, links the rest', async () => withHardLimit(2, async () => {
                    const response = await get(`${list()}&inline=auto`)
                    expect(response.status).toEqual(HttpStatus.OK)
                    const [small, other] = response.body.data
                    expect(small.alias_numbers).toHaveLength(2)
                    expect(other.alias_numbers).toEqual(link(`/api/subscribers/${subscribers.other.id}/@alias_numbers`, 1))
                }))

                it('counts the lazy fields of expanded objects against the same response', async () => withHardLimit(2, async () => {
                    const response = await get(`/api/subscribers/${subscribers.small.id}?expand=customer_id&inline=auto`)
                    expect(response.status).toEqual(HttpStatus.OK)
                    expect(response.body.alias_numbers).toHaveLength(2)
                    expect(response.body.customer_id_expand.billing_profiles).toEqual(link(`/api/customers/${customers.sip}/@billing_profiles`, 1))
                }))
            })

            it('rejects fields that are not lazy with 422, ignored with allow_unknown_params', async () => {
                for (const field of ['unknown', 'customer_id']) {
                    const response = await get(`/api/subscribers/${subscribers.small.id}?inline=${field}`)
                    expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                    expect(errors(response)).toEqual([{parameter: 'inline', code: 'INLINE_NOT_POSSIBLE'}])
                }
                const allowed = await get(`/api/subscribers/${subscribers.small.id}?inline=unknown&allow_unknown_params=true`)
                expect(allowed.status).toEqual(HttpStatus.OK)
                expect(allowed.body.alias_numbers.type).toEqual('link')
            })

            it('rejects all and auto together with 400', async () => {
                const response = await get(`/api/subscribers/${subscribers.small.id}?inline=all,auto`)
                expect(response.status).toEqual(HttpStatus.BAD_REQUEST)
                expect(errors(response)).toEqual([{parameter: 'inline', code: 'INLINE_INVALID'}])
            })
        })

        describe('@<field> collections', () => {
            it('pages and orders thousands of items in the database', async () => {
                const url = `/api/subscribers/${subscribers.big.id}/@alias_numbers`
                const last = await get(`${url}?order_by=number_id&order_by_direction=desc&rows=5`)
                expect(last.status).toEqual(HttpStatus.OK)
                expect(last.body.total_count).toEqual(BIG_ALIAS_COUNT)
                expect(last.body.data.map((number: {number_id: number}) => number.number_id)).toEqual(bigNumberIds.slice(-5).reverse())
                const page = await get(`${url}?order_by=number_id&rows=100&page=25`)
                expect(page.body.data.map((number: {number_id: number}) => number.number_id)).toEqual(bigNumberIds.slice(2400))
                const filtered = await get(`${url}?sn=${snBase}1249*`)
                expect(filtered.body.total_count).toEqual(10)
            })

            it('rejects rows above performance.read_rows_limit with 400', async () => {
                const response = await get(`/api/subscribers/${subscribers.big.id}/@alias_numbers?rows=10001`)
                expect(response.status).toEqual(HttpStatus.BAD_REQUEST)
                expect(errors(response)).toEqual([{parameter: 'rows', code: 'max'}])
            })

            it('returns 404 for fields that are not lazy and for unknown fields', async () => {
                for (const field of ['unknown', 'customer_id']) {
                    const response = await get(`/api/subscribers/${subscribers.small.id}/@${field}`)
                    expect(response.status).toEqual(HttpStatus.NOT_FOUND)
                }
            })

            it('returns 404 for an item out of the user\'s scope', async () => {
                const own = await get(`/api/subscribers/${subscribers.small.id}/@alias_numbers`, resellerCreds)
                expect(own.status).toEqual(HttpStatus.OK)
                const other = await get(`/api/subscribers/${subscribers.other.id}/@alias_numbers`, resellerCreds)
                expect(other.status).toEqual(HttpStatus.NOT_FOUND)
            })

            describe('condition @values', () => {
                const url = (): string => `/api/header-manipulations/sets/rules/conditions/${conditionId}/@values`
                const values = (response: request.Response): string[] => (response.body.data as {value: string}[]).map(value => value.value)

                it('reads the values of a subscriber condition with subscriber_id as its scope', async () => {
                    const response = await get(`${url()}?subscriber_id=${subscribers.small.id}`)
                    expect(response.status).toEqual(HttpStatus.OK)
                    expect(values(response)).toEqual(['foo', 'bar', 'baz'])
                    expect((await get(url())).status).toEqual(HttpStatus.NOT_FOUND)
                    expect((await get(`${url()}?subscriber_id=${subscribers.big.id}`)).status).toEqual(HttpStatus.NOT_FOUND)
                    expect((await get(`${url()}?subscriber_id=abc`)).status).toEqual(HttpStatus.NOT_FOUND)
                })

                it('filters the values by id and value', async () => {
                    const scope = `${url()}?subscriber_id=${subscribers.small.id}`
                    const [first] = (await get(scope)).body.data as {id: number}[]
                    const byId = await get(`${scope}&id=${first.id}`)
                    expect(byId.status).toEqual(HttpStatus.OK)
                    expect(values(byId)).toEqual(['foo'])
                    const byValue = await get(`${scope}&value=ba*&order_by=value&order_by_direction=desc`)
                    expect(values(byValue)).toEqual(['baz', 'bar'])
                })

                it('rejects other filters with 400', async () => {
                    const response = await get(`${url()}?subscriber_id=${subscribers.small.id}&match_name=X-Lazy`)
                    expect(response.status).toEqual(HttpStatus.BAD_REQUEST)
                    expect(errors(response)).toEqual([{parameter: 'match_name', code: 'whitelistValidation'}])
                })
            })

            it('takes inline and expand for its item class only', async () => {
                const url = `/api/subscribers/${subscribers.seat.id}/@pbx_group_ids`
                expect((await get(`${url}?inline=all`)).status).toEqual(HttpStatus.OK)
                const inline = await get(`${url}?inline=value`)
                expect(inline.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                expect(errors(inline)).toEqual([{parameter: 'inline', code: 'INLINE_NOT_POSSIBLE'}])
                const expand = await get(`${url}?expand=value`)
                expect(expand.status).toEqual(HttpStatus.BAD_REQUEST)
                expect(errors(expand)).toEqual([{parameter: 'expand', code: 'EXPAND_NOT_SUPPORTED'}])
            })
        })

        describe('expand', () => {
            it('inlines an expanded lazy field', async () => {
                const response = await get(`/api/subscribers/${subscribers.seat.id}?expand=pbx_group_ids`)
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.pbx_group_ids).toEqual([subscribers.group.id])
                expect(response.body.pbx_group_ids_expand.map((group: {id: number}) => group.id)).toEqual([subscribers.group.id])
            })

            it('expand=all leaves lazy fields that are not inlined as links, without <field>_expand', async () => {
                const linked = await get(`/api/subscribers/${subscribers.seat.id}?expand=all`)
                expect(linked.status).toEqual(HttpStatus.OK)
                expect(linked.body.pbx_group_ids).toEqual(link(`/api/subscribers/${subscribers.seat.id}/@pbx_group_ids`, 1))
                expect(linked.body).not.toHaveProperty('pbx_group_ids_expand')
                const inlined = await get(`/api/subscribers/${subscribers.seat.id}?expand=all&inline=all`)
                expect(inlined.body.pbx_group_ids_expand.map((group: {id: number}) => group.id)).toEqual([subscribers.group.id])
            })

            it('links the lazy fields of expanded objects to their own resources unless inlined', async () => {
                const linked = await get(`/api/subscribers/${subscribers.small.id}?expand=customer_id`)
                expect(linked.status).toEqual(HttpStatus.OK)
                expect(linked.body.customer_id_expand.billing_profiles).toEqual(link(`/api/customers/${customers.sip}/@billing_profiles`, 1))
                // a lazy field of objects is no expand path, all and auto reach it
                const path = await get(`/api/subscribers/${subscribers.small.id}?expand=customer_id.billing_profiles`)
                expect(path.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                expect(errors(path)).toEqual([{parameter: 'expand', code: 'EXPAND_NOT_POSSIBLE'}])
                const auto = await get(`/api/subscribers/${subscribers.small.id}?expand=customer_id&inline=auto`)
                expect(auto.body.customer_id_expand.billing_profiles).toHaveLength(1)
                expect(auto.body.alias_numbers).toHaveLength(2)
            })
        })
    })

    describe('Lazy fields DELETE', () => {
        it('delete fixtures', async () => {
            if (headerSetId)
                await db.provisioning.VoipHeaderRuleSet.delete(headerSetId)
            const billingIds = Object.values(subscribers).map(s => s.id)
            const provisioningIds = Object.values(subscribers).map(s => s.provisioningId)
            if (provisioningIds.length) {
                await appService.db.query(
                    'DELETE FROM provisioning.voip_pbx_groups WHERE group_id IN (?) OR subscriber_id IN (?)', [provisioningIds, provisioningIds],
                )
                await db.provisioning.VoipSubscriber.delete(provisioningIds)
            }
            if (billingIds.length) {
                await db.billing.VoipSubscriber.update(billingIds, {primary_number_id: null})
                await appService.db.query('DELETE FROM billing.voip_numbers WHERE subscriber_id IN (?)', [billingIds])
            }
            // the billing subscribers are deleted with their contracts
            const customerIds = contractIds.filter(id => id != otherResellerContractId)
            if (customerIds.length)
                await db.billing.Contract.delete(customerIds)
            if (contactIds.length)
                await db.billing.Contact.delete(contactIds)
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
            await db.billing.Admin.delete({login: In([creds.username, resellerCreds.username])})
        })
    })
})
