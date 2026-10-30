import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'
import {v4 as uuidv4} from 'uuid'

import {PbxUserModule} from './user.module'

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

describe('PBX User', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    const creds = {username: 'administrator', password: 'administrator'}

    const prefix = `e2e_pbx_user_${Date.now()}`
    const domain = `${prefix}.example.org`
    let billingDomainId: number
    let provisioningDomainId: number
    let productId: number
    let customerA: PbxCustomer // pilot, seats [s1, s2], groups [g1]
    let customerB: PbxCustomer // seats [s1]
    const createdContactIds: number[] = []
    const createdContractIds: number[] = []
    const createdBillingSubscriberIds: number[] = []
    const createdProvisioningSubscriberIds: number[] = []
    const createdNumberIds: number[] = []

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


    const createPbxCustomers = async (): Promise<void> => {
        productId = (await db.billing.Product.findOneByOrFail({class: ProductClass.PbxAccount})).id
        billingDomainId = (await db.billing.Domain.create({domain, reseller_id: 1}).save()).id
        provisioningDomainId = (await db.provisioning.VoipDomain.create({domain}).save()).id

        customerA = await createCustomer('a', {pilot: true, seats: 2, groups: 1})
        customerB = await createCustomer('b', {seats: 1})
    }

    const deletePbxCustomers = async (): Promise<void> => {
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
            imports: [PbxUserModule, AppModule],
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

    // other e2e suites may create pbx users concurrently, so the count is only exact for scoped roles
    const readUserIds = async (headers: Record<string, string>, exactCount = true): Promise<number[]> => {
        const response = await request(app.getHttpServer())
            .get('/pbx/users?rows=1000')
            .set(headers)
        expect(response.status).toEqual(200)
        const [users, count]: [{id: number}[], number] = response.body
        if (exactCount)
            expect(count).toEqual(users.length)
        return users.map(user => user.id).sort((x, y) => x - y)
    }

    const ids = (subscribers: {id: number}[]): number[] => subscribers.map(s => s.id).sort((x, y) => x - y)

    describe('', () => { // main tests block
        describe('GET', () => {
            it('read pbx users', async () => {
                const response = await request(app.getHttpServer())
                    .get('/pbx/users')
                    .set(...authHeader)
                expect(response.status).toEqual(200)
            })

            it('read pbx users without pilots and groups', async () => {
                const userIds = await readUserIds({[authHeader[0]]: authHeader[1]}, false)
                const createdIds = ids([customerA.pilot, ...customerA.seats, ...customerA.groups, ...customerB.seats])
                expect(userIds.filter(id => createdIds.includes(id))).toEqual(ids([...customerA.seats, ...customerB.seats]))
            })

            it('read pilot by id', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/pbx/users/${customerA.pilot.id}`)
                    .set(...authHeader)
                expect(response.status).toEqual(404)
            })
        })

        describe('GET as subscriberadmin', () => {
            let pilotAuthHeaders: Record<string, string>

            it('obtain auth token', async () => {
                pilotAuthHeaders = await subscriberAuthHeaders(customerA.pilot.login)
            })

            it('read pbx users of own customer', async () => {
                expect(await readUserIds(pilotAuthHeaders)).toEqual(ids(customerA.seats))
            })

            it('read pbx user of other customer by id', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/pbx/users/${customerB.seats[0].id}`)
                    .set(pilotAuthHeaders)
                expect(response.status).toEqual(404)
            })
        })

        describe('GET as subscriber', () => {
            let seatAuthHeaders: Record<string, string>

            it('obtain auth token', async () => {
                seatAuthHeaders = await subscriberAuthHeaders(customerA.seats[0].login)
            })

            it('read only own pbx user', async () => {
                expect(await readUserIds(seatAuthHeaders)).toEqual([customerA.seats[0].id])
            })

            it('read own pbx user by id', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/pbx/users/${customerA.seats[0].id}`)
                    .set(seatAuthHeaders)
                expect(response.status).toEqual(200)
                expect(response.body.id).toEqual(customerA.seats[0].id)
            })

            it('read other pbx user by id', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/pbx/users/${customerA.seats[1].id}`)
                    .set(seatAuthHeaders)
                expect(response.status).toEqual(404)
            })
        })
    })
})