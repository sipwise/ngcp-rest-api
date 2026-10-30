import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'
import {v4 as uuidv4} from 'uuid'

import {PbxGroupModule} from './group.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {db} from '~/entities'
import {VoipSubscriber as BillingVoipSubscriber} from '~/entities/db/billing/voip-subscriber.mariadb.entity'
import {ProductClass} from '~/entities/internal/product.internal.entity'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

interface PbxSubscriber {
    id: number
    provisioningId: number
    login: string
}

interface PbxCustomer {
    contractId: number
    pilot?: PbxSubscriber
    seats: PbxSubscriber[]
    groups: PbxSubscriber[]
}

describe('PBX Group', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    const creds = {username: 'administrator', password: 'administrator'}

    const prefix = `e2e_pbx_group_${Date.now()}`
    const domain = `${prefix}.example.org`
    let billingDomainId: number
    let provisioningDomainId: number
    let productId: number
    let customerA: PbxCustomer // pilot, seats [s1], groups [g1: s1, g2: empty]
    let customerB: PbxCustomer // groups [g1]
    const createdContactIds: number[] = []
    const createdContractIds: number[] = []
    const createdBillingSubscriberIds: number[] = []
    const createdProvisioningSubscriberIds: number[] = []
    const createdNumberIds: number[] = []
    const createdPbxGroupMemberIds: number[] = []

    const createSubscriber = async (
        contractId: number,
        username: string,
        extension: string,
        flags: {admin?: boolean, pilot?: boolean, group?: boolean} = {},
    ): Promise<PbxSubscriber> => {
        const uuid = uuidv4()
        const insertResult = await BillingVoipSubscriber.insert({ // insert instead of create to avoid a cyclic dependency error
            contract_id: contractId,
            uuid: uuid,
            username: username,
            domain_id: billingDomainId,
            status: 'active',
        })
        const id: number = insertResult.identifiers[0].id
        createdBillingSubscriberIds.push(id)
        const number = await db.billing.VoipNumber.create({
            cc: 99,
            ac: '9',
            sn: `${Date.now()}${id}`.slice(-15),
            reseller_id: 1,
            subscriber_id: id,
        }).save()
        createdNumberIds.push(number.id)
        await BillingVoipSubscriber.update(id, {primary_number_id: number.id})
        const provisioningInsertResult = await db.provisioning.VoipSubscriber.insert({
            username: username,
            domain_id: provisioningDomainId,
            uuid: uuid,
            password: uuidv4().slice(0, 16),
            admin: !!flags.admin,
            account_id: contractId,
            webusername: username,
            webpassword: 'e2e',
            is_pbx_pilot: !!flags.pilot,
            is_pbx_group: !!flags.group,
            pbx_extension: extension,
        })
        const provisioningId: number = provisioningInsertResult.identifiers[0].id
        createdProvisioningSubscriberIds.push(provisioningId)
        return {id, provisioningId, login: `${username}@${domain}`}
    }

    const createCustomer = async (
        name: string,
        {pilot = false, seats = 0, groups = 0}: {pilot?: boolean, seats?: number, groups?: number},
    ): Promise<PbxCustomer> => {
        const contact = await db.billing.Contact.create({
            reseller_id: 1,
            email: `${prefix}_${name}@example.org`,
            create_timestamp: new Date(),
        }).save()
        createdContactIds.push(contact.id)
        const contract = await db.billing.Contract.create({
            contact_id: contact.id,
            product_id: productId,
        }).save()
        createdContractIds.push(contract.id)
        const customer: PbxCustomer = {
            contractId: contract.id,
            pilot: pilot ? await createSubscriber(contract.id, `${prefix}_${name}_pilot`, null, {admin: true, pilot: true}) : undefined,
            seats: [],
            groups: [],
        }
        for (let i = 1; i <= seats; i++)
            customer.seats.push(await createSubscriber(contract.id, `${prefix}_${name}_s${i}`, `1${i}`))
        for (let i = 1; i <= groups; i++)
            customer.groups.push(await createSubscriber(contract.id, `${prefix}_${name}_g${i}`, `9${i}`, {group: true}))
        return customer
    }

    const addGroupMembers = async (group: PbxSubscriber, members: PbxSubscriber[]): Promise<void> => {
        for (const member of members) {
            const pbxGroupMember = await db.provisioning.VoipPbxGroup.create({
                group_id: group.provisioningId,
                subscriber_id: member.provisioningId,
            }).save()
            createdPbxGroupMemberIds.push(pbxGroupMember.id)
        }
    }

    const createPbxCustomers = async (): Promise<void> => {
        productId = (await db.billing.Product.findOneByOrFail({class: ProductClass.PbxAccount})).id
        billingDomainId = (await db.billing.Domain.create({domain, reseller_id: 1}).save()).id
        provisioningDomainId = (await db.provisioning.VoipDomain.create({domain}).save()).id

        customerA = await createCustomer('a', {pilot: true, seats: 1, groups: 2})
        customerB = await createCustomer('b', {groups: 1})
        await addGroupMembers(customerA.groups[0], customerA.seats)
    }

    const deletePbxCustomers = async (): Promise<void> => {
        if (createdPbxGroupMemberIds.length)
            await db.provisioning.VoipPbxGroup.delete(createdPbxGroupMemberIds)
        if (createdProvisioningSubscriberIds.length)
            await db.provisioning.VoipSubscriber.delete(createdProvisioningSubscriberIds)
        if (createdBillingSubscriberIds.length)
            await BillingVoipSubscriber.update(createdBillingSubscriberIds, {primary_number_id: null})
        if (createdNumberIds.length)
            await db.billing.VoipNumber.delete(createdNumberIds)
        if (createdBillingSubscriberIds.length)
            await BillingVoipSubscriber.delete(createdBillingSubscriberIds)
        if (createdContractIds.length)
            await db.billing.Contract.delete(createdContractIds)
        if (createdContactIds.length)
            await db.billing.Contact.delete(createdContactIds)
        if (provisioningDomainId)
            await db.provisioning.VoipDomain.delete(provisioningDomainId)
        if (billingDomainId)
            await db.billing.Domain.delete(billingDomainId)
    }

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [PbxGroupModule, AppModule],
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

        await app.init()

        await createPbxCustomers()
    })

    afterAll(async () => {
        await deletePbxCustomers()
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

    const subscriberAuthHeaders = async (login: string): Promise<Record<string, string>> => {
        const response = await request(app.getHttpServer())
            .post('/auth/jwt')
            .set('x-auth-realm', 'subscriber')
            .send({username: login, password: 'e2e'})
        expect(response.status).toEqual(201)
        return {'Authorization': 'Bearer ' + response.body['access_token'], 'x-auth-realm': 'subscriber'}
    }

    const adminAuthHeaders = (): Record<string, string> => ({[authHeader[0]]: authHeader[1]})

    const readGroupIds = async (headers: Record<string, string>, query = ''): Promise<number[]> => {
        const response = await request(app.getHttpServer())
            .get(`/pbx/groups?name=${prefix}*${query}`)
            .set(headers)
        expect(response.status).toEqual(200)
        const [groups, count]: [{id: number}[], number] = response.body
        expect(count).toEqual(groups.length)
        return groups.map(group => group.id).sort((x, y) => x - y)
    }

    const ids = (subscribers: {id: number}[]): number[] => subscribers.map(s => s.id).sort((x, y) => x - y)

    describe('', () => { // main tests block
        describe('GET as admin', () => {
            it('read pbx groups', async () => {
                const response = await request(app.getHttpServer())
                    .get('/pbx/groups')
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const [groups, count] = response.body
                expect(count).toBeGreaterThanOrEqual(groups.length)
            })

            it('read only groups, not pilots or seats', async () => {
                expect(await readGroupIds(adminAuthHeaders())).toEqual(ids([...customerA.groups, ...customerB.groups]))
            })

            it('read pbx group by id', async () => {
                const group = customerA.groups[0]
                const response = await request(app.getHttpServer())
                    .get(`/pbx/groups/${group.id}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                expect(response.body.id).toEqual(group.id)
                expect(response.body.customer_id).toEqual(customerA.contractId)
                expect(response.body.extension).toEqual('91')
            })

            it('read pilot by id as group', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/pbx/groups/${customerA.pilot.id}`)
                    .set(...authHeader)
                expect(response.status).toEqual(404)
            })

            it('search pbx groups by customer_id', async () => {
                expect(await readGroupIds(adminAuthHeaders(), `&customer_id=${customerA.contractId}`)).toEqual(ids(customerA.groups))
            })

            it('search pbx groups by extension', async () => {
                expect(await readGroupIds(adminAuthHeaders(), `&customer_id=${customerA.contractId}&extension=92`)).toEqual(ids([customerA.groups[1]]))
            })

            it('search pbx groups by id', async () => {
                const group = customerB.groups[0]
                expect(await readGroupIds(adminAuthHeaders(), `&id=${group.id}`)).toEqual([group.id])
            })

            it('read non-existing pbx group', async () => {
                const response = await request(app.getHttpServer())
                    .get('/pbx/groups/999999999')
                    .set(...authHeader)
                expect(response.status).toEqual(404)
            })
        })

        describe('GET as subscriberadmin', () => {
            let pilotAuthHeaders: Record<string, string>

            it('obtain auth token', async () => {
                pilotAuthHeaders = await subscriberAuthHeaders(customerA.pilot.login)
            })

            it('read groups of own customer', async () => {
                expect(await readGroupIds(pilotAuthHeaders)).toEqual(ids(customerA.groups))
            })

            it('read own customer group by id', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/pbx/groups/${customerA.groups[1].id}`)
                    .set(pilotAuthHeaders)
                expect(response.status).toEqual(200)
            })

            it('read other customer group by id', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/pbx/groups/${customerB.groups[0].id}`)
                    .set(pilotAuthHeaders)
                expect(response.status).toEqual(404)
            })
        })

        describe('GET as subscriber', () => {
            let seatAuthHeaders: Record<string, string>

            it('obtain auth token', async () => {
                seatAuthHeaders = await subscriberAuthHeaders(customerA.seats[0].login)
            })

            it('read only groups the subscriber is a member of', async () => {
                expect(await readGroupIds(seatAuthHeaders)).toEqual(ids([customerA.groups[0]]))
            })

            it('read member group by id', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/pbx/groups/${customerA.groups[0].id}`)
                    .set(seatAuthHeaders)
                expect(response.status).toEqual(200)
            })

            it('read non-member group by id', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/pbx/groups/${customerA.groups[1].id}`)
                    .set(seatAuthHeaders)
                expect(response.status).toEqual(404)
            })

            it('read own subscriber by id as group', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/pbx/groups/${customerA.seats[0].id}`)
                    .set(seatAuthHeaders)
                expect(response.status).toEqual(404)
            })
        })
    })
})
