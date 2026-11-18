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
import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'
import {VoipSubscriberStatus} from '~/entities/internal/voip-subscriber.internal.entity'

const RESELLER_ID = 1
const RESELLER_PRODUCT_ID = 3
const SIPACCOUNT_PRODUCT_ID = 4
const PBXACCOUNT_PRODUCT_ID = 5
const SYSTEM_CONTACT_ID = 2
const BILLING_PROFILE_ID = 1

interface Login {
    username: string
    password: string
}

interface ErrorEntry {
    parameter?: string
    code: string
}

describe('Expand', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    const worker = process.env.JEST_WORKER_ID
    const suffix = `${worker}${Date.now()}`
    const prefix = `e2e-exp-${suffix}`
    const domain = `${prefix}.example.org`
    // unique number block of the run, 43 97 <sn>
    const snBase = `${worker}${String(Date.now()).slice(-8)}`
    const creds: Login = {username: `mockAdminUser${worker}`, password: 'mockAdminPass'}
    const resellerCreds: Login = {username: `mockResellerUser${worker}`, password: 'mockAdminPass'}
    const contractIds: number[] = []
    const contactIds: number[] = []
    const templateIds: number[] = []
    const numberIds: number[] = []
    const subscribers: Record<string, {id: number, provisioningId: number}> = {}
    const contacts: Record<string, number> = {}
    const customers: Record<string, number> = {}
    const email = (name: string): string => `${prefix}-${name}@example.org`
    let otherResellerId: number
    let otherResellerContractId: number
    let billingDomainId: number
    let provisioningDomainId: number
    let otherTemplateName: string
    let rewriteSetId: number
    let rewriteRuleId: number

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

    const createContact = async (name: string, resellerId: number, timezone?: string): Promise<number> => {
        const contact = await db.billing.Contact.create({
            reseller_id: resellerId,
            email: email(name),
            timezone,
            create_timestamp: new Date('2026-07-01T12:00:00Z'),
        }).save()
        contactIds.push(contact.id)
        contacts[name] = contact.id
        return contact.id
    }

    const createContract = async (productId: number, contactId: number): Promise<number> => {
        const contract = await db.billing.Contract.create({
            contact_id: contactId,
            product_id: productId,
            status: ContractStatus.Active,
            create_timestamp: new Date('2026-07-01T12:00:00Z'),
            modify_timestamp: new Date('2026-07-01T12:00:00Z'),
        }).save()
        contractIds.push(contract.id)
        // /customers reads the billing profile mapping of a customer
        if (productId != RESELLER_PRODUCT_ID)
            await appService.db.query('call billing.schedule_contract_billing_profile_network(?,?,?)', [contract.id, null, `,,${BILLING_PROFILE_ID},,;`])
        return contract.id
    }

    const createTemplate = async (name: string, resellerId: number): Promise<number> => {
        const result = await db.billing.InvoiceTemplate.insert({reseller_id: resellerId, name})
        const id = (result.identifiers[0] as {id: number}).id
        templateIds.push(id)
        return id
    }

    const createSubscriber = async (
        name: string,
        contractId: number,
        billing: Partial<db.billing.VoipSubscriber> = {},
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
        }
    }

    // pbx seats and groups have a primary number (read by /pbx/users)
    const addPrimaryNumber = async (name: string, sn: string): Promise<void> => {
        const number = await db.billing.VoipNumber.create({
            cc: 43, ac: '97', sn: `${snBase}${sn}`, reseller_id: RESELLER_ID, subscriber_id: subscribers[name].id,
        }).save()
        numberIds.push(number.id)
        await db.billing.VoipSubscriber.update(subscribers[name].id, {primary_number_id: number.id})
    }

    const get = (url: string, user: Login = creds): request.Test => request(app.getHttpServer())
        .get(url)
        .auth(user.username, user.password)
        .set('Accept', 'application/json')

    const ids = (response: request.Response): number[] =>
        (response.body.data as {id: number}[]).map(item => item.id).sort((a, b) => a - b)

    const errors = (response: request.Response): ErrorEntry[] =>
        (response.body.errors as ErrorEntry[]).map(({parameter, code}) => ({parameter, code}))

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

        // own reseller: tokyo (customer owner zone), plain and new york contacts; another reseller's contact
        await createContact('tokyo', RESELLER_ID, 'Asia/Tokyo')
        await createContact('plain', RESELLER_ID)
        await createContact('newyork', RESELLER_ID, 'America/New_York')
        await createContact('other', otherResellerId)

        otherTemplateName = `${prefix}-other`
        // the tokyo customer refers to another reseller's invoice template, out of a reseller admin's scope
        const otherTemplateId = await createTemplate(otherTemplateName, otherResellerId)
        await createTemplate(`${prefix}-own`, RESELLER_ID)
        customers.tokyo = await createContract(SIPACCOUNT_PRODUCT_ID, contacts.tokyo)
        await db.billing.Contract.update(customers.tokyo, {invoice_template_id: otherTemplateId})
        customers.plain = await createContract(SIPACCOUNT_PRODUCT_ID, contacts.plain)
        customers.pbx = await createContract(PBXACCOUNT_PRODUCT_ID, contacts.plain)
        customers.other = await createContract(SIPACCOUNT_PRODUCT_ID, contacts.other)

        await createSubscriber('sip', customers.tokyo, {contact_id: contacts.newyork})
        await createSubscriber('seat', customers.pbx, {}, {pbx_extension: '101'})
        await createSubscriber('group', customers.pbx, {}, {
            is_pbx_group: true, pbx_extension: '200', pbx_hunt_policy: 'serial', pbx_hunt_timeout: 10, pbx_hunt_cancel_mode: 'bye',
        })
        await addPrimaryNumber('seat', '101')
        await addPrimaryNumber('group', '200')
        await db.provisioning.VoipPbxGroup.insert({group_id: subscribers.group.provisioningId, subscriber_id: subscribers.seat.provisioningId})

        rewriteSetId = (await db.provisioning.VoipRewriteRuleSet.insert({reseller_id: RESELLER_ID, name: `exp${suffix}`.slice(0, 32)})).identifiers[0].id
        rewriteRuleId = (await db.provisioning.VoipRewriteRule.insert({
            set_id: rewriteSetId, match_pattern: '^1$', replace_pattern: '2', description: prefix, direction: 'in', field: 'callee',
        })).identifiers[0].id
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

        describe('expand', () => {
            it('expands an item into the object the target\'s own GET returns', async () => {
                const response = await get(`/api/customers/${customers.plain}?expand=contact_id`)
                const contact = await get(`/api/customercontacts/${contacts.plain}`)
                expect([response.status, contact.status]).toEqual([HttpStatus.OK, HttpStatus.OK])
                expect(response.body.contact_id_expand).toEqual(contact.body)
            })

            it('expands every item of a collection', async () => {
                const response = await get(`/api/customers?id=${customers.tokyo},${customers.plain},${customers.pbx}&expand=contact_id`)
                expect(response.status).toEqual(HttpStatus.OK)
                const expanded = (response.body.data as {id: number, contact_id_expand: {id: number}}[])
                    .map(item => [item.id, item.contact_id_expand.id])
                    .sort((a, b) => a[0] - b[0])
                expect(expanded).toEqual([
                    [customers.tokyo, contacts.tokyo],
                    [customers.plain, contacts.plain],
                    [customers.pbx, contacts.plain],
                ])
            })

            it('expands a comma list of paths and nested paths', async () => {
                const response = await get(`/api/subscribers/${subscribers.sip.id}?expand=customer_id.contact_id,domain_id`)
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.customer_id_expand.id).toEqual(customers.tokyo)
                expect(response.body.customer_id_expand.contact_id_expand.id).toEqual(contacts.tokyo)
                expect(response.body.domain_id_expand.id).toEqual(billingDomainId)
            })

            it('expands id arrays in order', async () => {
                const response = await get(`/api/subscribers/${subscribers.seat.id}?expand=pbx_group_ids`)
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.pbx_group_ids).toEqual([subscribers.group.id])
                expect(response.body.pbx_group_ids_expand.map((group: {id: number}) => group.id)).toEqual([subscribers.group.id])
            })

            it('expands a null id to null', async () => {
                const response = await get(`/api/customers/${customers.plain}?expand=invoice_template_id`)
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.invoice_template_id).toBeNull()
                expect(response.body.invoice_template_id_expand).toBeNull()
            })

            it('expands a field with its own target (@Expand)', async () => {
                const response = await get(`/api/rewrite-rules/sets/rules/${rewriteRuleId}?expand=set_id`)
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.set_id_expand.id).toEqual(rewriteSetId)
            })

            it('all expands every allowed field and leaves out the ones the user may not read', async () => {
                const response = await get(`/api/customers/${customers.tokyo}?expand=all`, resellerCreds)
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.contact_id_expand.id).toEqual(contacts.tokyo)
                expect(response.body).not.toHaveProperty('invoice_template_id_expand')
            })

            it('renders an expanded object in its own owner zone with tz=owner', async () => {
                const subscriber = await get(`/api/subscribers/${subscribers.sip.id}?tz=owner&expand=customer_id`)
                const customer = await get(`/api/customers/${customers.tokyo}?tz=owner`)
                expect([subscriber.status, customer.status]).toEqual([HttpStatus.OK, HttpStatus.OK])
                expect(customer.body.create_timestamp).toEqual('2026-07-01T21:00:00.000+09:00')
                expect(subscriber.body.customer_id_expand.create_timestamp).toEqual(customer.body.create_timestamp)
            })

        })

        describe('expand errors and access', () => {
            it.each([
                'name',
                'unknown',
                'contact_id.unknown',
            ])('rejects expand=%s with 422, also for an empty result', async path => {
                for (const url of [`/api/customers/${customers.plain}`, '/api/customers?id=0']) {
                    const response = await get(`${url}${url.includes('?') ? '&' : '?'}expand=${path}`)
                    expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                    expect(errors(response)).toEqual([{parameter: 'expand', code: 'EXPAND_NOT_POSSIBLE'}])
                }
            })

            it('rejects expand on a write with 400 before anything is written', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/customercontacts?expand=reseller_id')
                    .auth(creds.username, creds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send({reseller_id: RESELLER_ID, email: email('created'), status: 'active'})
                expect(response.status).toEqual(HttpStatus.BAD_REQUEST)
                expect(errors(response)).toEqual([{parameter: 'expand', code: 'EXPAND_NOT_SUPPORTED'}])

                const created = await get(`/api/customercontacts?email=${email('created')}`)
                expect(created.body.total_count).toEqual(0)
            })

            it('rejects expand on /auth with 400', async () => {
                const response = await get('/api/auth/userinfo?expand=reseller_id')
                expect(response.status).toEqual(HttpStatus.BAD_REQUEST)
                expect(errors(response)).toEqual([{parameter: 'expand', code: 'EXPAND_NOT_SUPPORTED'}])
            })

            it('rejects expand on a CSV export with 400, the JSON read expands', async () => {
                const url = `/api/customers/${customers.plain}/phonebook?expand=customer_id`
                const csv = await request(app.getHttpServer())
                    .get(url)
                    .auth(creds.username, creds.password)
                    .set('Accept', 'text/csv')
                expect(csv.status).toEqual(HttpStatus.BAD_REQUEST)
                expect(csv.headers['content-type']).toMatch(/^application\/json/)
                expect(errors(csv)).toEqual([{parameter: 'expand', code: 'EXPAND_NOT_SUPPORTED'}])

                const json = await get(url)
                expect(json.status).toEqual(HttpStatus.OK)
            })

            it('rejects a target the role may not read with 403', async () => {
                const response = await get(`/api/domains/${billingDomainId}?expand=reseller_id`, resellerCreds)
                expect(response.status).toEqual(HttpStatus.FORBIDDEN)
                expect(errors(response)).toEqual([{parameter: 'expand', code: 'EXPAND_FORBIDDEN'}])
            })

            it.each([
                ['depth 1', (): string => `/api/customers/${customers.tokyo}?expand=invoice_template_id`],
                ['depth 2', (): string => `/api/subscribers/${subscribers.sip.id}?expand=customer_id.invoice_template_id`],
            ])('rejects an id outside the caller\'s scope with 403 at %s', async (_name, url) => {
                const response = await get(url(), resellerCreds)
                expect(response.status).toEqual(HttpStatus.FORBIDDEN)
                expect(errors(response)).toEqual([{parameter: 'expand', code: 'EXPAND_FORBIDDEN'}])

                const admin = await get(url())
                expect(admin.status).toEqual(HttpStatus.OK)
            })

            it('rejects a field hidden for the role with 422, soft_expand skips it', async () => {
                // admins show reseller_id to admins only
                const url = `/api/admins?login=${resellerCreds.username}&expand=reseller_id`
                const admin = await get(url)
                expect(admin.status).toEqual(HttpStatus.OK)
                expect(admin.body.data[0].reseller_id_expand).toMatchObject({id: admin.body.data[0].reseller_id})

                const response = await get(url, resellerCreds)
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                expect(errors(response)).toEqual([{parameter: 'expand', code: 'EXPAND_NOT_POSSIBLE'}])

                const soft = await get(`${url}&soft_expand=1`, resellerCreds)
                expect(soft.status).toEqual(HttpStatus.OK)
                expect(soft.body.data).toHaveLength(1)
                expect(soft.body.data[0]).not.toHaveProperty('reseller_id_expand')
            })

            it('soft_expand returns only what can be expanded, a syntax error stays 400', async () => {
                const response = await get(`/api/customers/${customers.tokyo}?expand=contact_id,invoice_template_id,name,unknown&soft_expand=1`, resellerCreds)
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.contact_id_expand.id).toEqual(contacts.tokyo)
                expect(Object.keys(response.body).filter(key => key.endsWith('_expand'))).toEqual(['contact_id_expand'])

                const auth = await get('/api/auth/userinfo?expand=reseller_id&soft_expand=1')
                expect(auth.status).toEqual(HttpStatus.OK)
                expect(auth.body).not.toHaveProperty('reseller_id_expand')

                const syntax = await get(`/api/customers/${customers.tokyo}?expand=contact_id..email&soft_expand=1`)
                expect(syntax.status).toEqual(HttpStatus.BAD_REQUEST)
                expect(errors(syntax)).toEqual([{parameter: 'expand', code: 'EXPAND_INVALID_PATH'}])
            })
        })

        describe('nested filters', () => {
            it('filters by a field of the referenced item', async () => {
                const response = await get(`/api/customers?contact_id.email=${email('tokyo')}`)
                expect(response.status).toEqual(HttpStatus.OK)
                expect(ids(response)).toEqual([customers.tokyo])
            })

            it('filters two levels deep, with wildcards', async () => {
                const response = await get(`/api/subscribers?customer_id.contact_id.email=${prefix}-pl*`)
                expect(response.status).toEqual(HttpStatus.OK)
                expect(ids(response)).toEqual([subscribers.seat.id, subscribers.group.id].sort((a, b) => a - b))
            })

            it('matches nothing when no referenced item matches', async () => {
                const response = await get(`/api/customers?contact_id.email=${email('none')}`)
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.data).toEqual([])
                expect(response.body.total_count).toEqual(0)
            })

            it('matches only referenced items in the caller\'s scope', async () => {
                const admin = await get(`/api/customers?invoice_template_id.name=${otherTemplateName}`)
                expect(ids(admin)).toEqual([customers.tokyo])
                const reseller = await get(`/api/customers?invoice_template_id.name=${otherTemplateName}`, resellerCreds)
                expect(reseller.status).toEqual(HttpStatus.OK)
                expect(reseller.body.data).toEqual([])
            })

            it('is combined with a direct filter on the same field with AND', async () => {
                const other = await get(`/api/customers?contact_id.email=${email('tokyo')}&contact_id=${contacts.plain}`)
                expect(other.body.data).toEqual([])
                const same = await get(`/api/customers?contact_id.email=${email('tokyo')}&contact_id=${contacts.tokyo},${contacts.plain}`)
                expect(ids(same)).toEqual([customers.tokyo])
                // search_or combines the direct filters only
                const or = await get(`/api/customers?contact_id.email=${email('tokyo')}&status=terminated&id=${customers.plain}&search_or=1`)
                expect(or.body.data).toEqual([])
            })

            it('rejects an unknown filter of the target with 422 and the dotted name', async () => {
                const response = await get('/api/subscribers?customer_id.contact_id.unknown=1')
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                expect(errors(response)).toEqual([{parameter: 'customer_id.contact_id.unknown', code: 'whitelistValidation'}])
            })

            it.each([
                ['a non-expandable field', (): string => '/api/customers?status.id=1', 'status.id'],
                // the item read ignores list filters
                ['a filter the endpoint does not apply', (): string => `/api/subscribers/${subscribers.sip.id}?customer_id.contact_id=${contacts.tokyo}`, 'customer_id.contact_id'],
            ])('rejects %s with 422', async (_name, url, parameter) => {
                const response = await get(url())
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                expect(errors(response)).toEqual([{parameter, code: 'EXPAND_NOT_POSSIBLE'}])
            })

            it('rejects more ids than expand.filter_max_ids with 422', async () => {
                const config = AppService.config.expand
                AppService.config.expand = {filter_max_ids: 2}
                try {
                    const response = await get(`/api/customers?contact_id.email=${prefix}-*`)
                    expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                    expect(errors(response)).toEqual([{parameter: 'contact_id.email', code: 'EXPAND_NOT_POSSIBLE'}])
                } finally {
                    AppService.config.expand = config
                }
            })

            it('is not limited by performance.read_limit, it pages its own reads', async () => {
                const config = AppService.config.performance
                AppService.config.performance = {...config, read_limit: 1}
                try {
                    const response = await get(`/api/subscribers?customer_id.contact_id.email=${prefix}-pl*`)
                    expect(response.status).toEqual(HttpStatus.OK)
                    expect(ids(response)).toEqual([subscribers.seat.id, subscribers.group.id].sort((a, b) => a - b))
                } finally {
                    AppService.config.performance = config
                }
            })

            it('rejects order_by on a dotted path with 422', async () => {
                const response = await get('/api/customers?order_by=contact_id.email')
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                expect(errors(response)).toEqual([{parameter: 'order_by', code: 'isIn'}])
            })

            it('denies a target the role may not read with 403', async () => {
                const response = await get(`/api/domains?reseller_id.name=${prefix}`, resellerCreds)
                expect(response.status).toEqual(HttpStatus.FORBIDDEN)
                expect(errors(response)).toEqual([{parameter: 'reseller_id.name', code: 'EXPAND_FORBIDDEN'}])
            })
        })
    })

    describe('Expand DELETE', () => {
        it('delete fixtures', async () => {
            const provisioningIds = Object.values(subscribers).map(s => s.provisioningId)
            if (provisioningIds.length) {
                await appService.db.query(
                    'DELETE FROM provisioning.voip_pbx_groups WHERE group_id IN (?) OR subscriber_id IN (?)', [provisioningIds, provisioningIds],
                )
                await db.provisioning.VoipSubscriber.delete(provisioningIds)
            }
            if (rewriteSetId)
                await db.provisioning.VoipRewriteRuleSet.delete(rewriteSetId)
            if (numberIds.length)
                await db.billing.VoipNumber.delete(numberIds)
            // the billing subscribers are deleted with their contracts
            const customerIds = contractIds.filter(id => id != otherResellerContractId)
            if (customerIds.length)
                await db.billing.Contract.delete(customerIds)
            if (templateIds.length)
                await db.billing.InvoiceTemplate.delete(templateIds)
            if (contactIds.length) {
                await db.billing.Journal.delete({resource_name: 'customercontacts', resource_id: In(contactIds)})
                await db.billing.Contact.delete(contactIds)
            }
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
