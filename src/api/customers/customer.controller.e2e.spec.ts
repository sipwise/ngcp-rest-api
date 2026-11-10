import {ClassSerializerInterceptor, HttpStatus, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {In} from 'typeorm'

import {CustomerModule} from './customer.module'
import {CustomerResponseDto} from './dto/customer-response.dto'
import {CustomerMariadbRepository} from './repositories/customer.mariadb.repository'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {BillingNetworkStatus} from '~/entities/internal/billing-network.internal.entity'
import {BillingProfileStatus} from '~/entities/internal/billing-profile.internal.entity'
import {ContractBillingProfileDefinition, ContractStatus, ContractStatus as CustomerStatus} from '~/entities/internal/contract.internal.entity'
import {CustomerType} from '~/entities/internal/customer.internal.entity'
import {Discriminator} from '~/entities/internal/profile-package-set.internal.entity'
import {toLocalDateTime} from '~/helpers/date.helper'
import {ErrorEntry} from '~/helpers/errors.helper'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {validate} from '~/helpers/validate.helper'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

type BillingProfilePost = {
    profile_id: number | null,
    network_id: number | null,
    start: string | null,
    stop: string | null,
}

type CustomerPost = {
    add_vat: boolean
    contact_id: number
    profile_package_id?: number
    billing_profile_id?: number
    status: CustomerStatus
    type: CustomerType
    start_date?: string
    max_subscribers?: number
    external_id?: string
    vat_rate?: number
    subscriber_email_template_id?: number
    passreset_email_template_id?: number
    invoice_email_template_id?: number
    invoice_template_id?: number
    billing_profile_definition?: ContractBillingProfileDefinition
    billing_profiles?: BillingProfilePost[]
}

type Mapping = {
    profileId: number
    networkId?: number
    start?: Date
    end?: Date
}

const DAY = 24 * 3600 * 1000
const CONTACT_ID = 1
const RESELLER_ID = 1
const SIPACCOUNT_PRODUCT_ID = 4
const RESELLER_PRODUCT_ID = 3

// whole seconds, as stored in DATETIME columns
const at = (offset: number): Date => new Date(Math.floor((Date.now() + offset) / 1000) * 1000)

describe('CustomerController', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    const createdCustomerIds: number[] = []
    const _createdContactIds: number[] = []
    const _createdBillingProfileIds: number[] = []
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    let repo: CustomerMariadbRepository
    const suffix = `${Date.now()}`
    const fixtureContractIds: number[] = []
    const profileIds: number[] = []
    const networkIds: number[] = []
    const packageIds: number[] = []
    let otherResellerContractId: number
    let otherResellerId: number
    let profileA: number
    let profileB: number
    let profileC: number
    let profileTerminated: number
    let profileNoReseller: number
    let profileOtherReseller: number
    let networkA: number
    let networkTerminated: number
    let packageA: number
    let packageB: number
    const emailTemplateIds: number[] = []
    const invoiceTemplateIds: number[] = []
    const ownTemplates: {[key: string]: number} = {}
    const foreignTemplates: {[key: string]: number} = {}

    const createProfile = async (name: string, resellerId: number | null, status = BillingProfileStatus.Active): Promise<number> => {
        const profile = await db.billing.BillingProfile.create({
            reseller_id: resellerId,
            handle: `e2e_${name}_${suffix}`,
            name: `e2e ${name} ${suffix}`.substring(0, 31),
            status: status,
        }).save()
        profileIds.push(profile.id)
        return profile.id
    }

    const createPackage = async (name: string, profileId: number): Promise<number> => {
        const pkg = await db.billing.ProfilePackage.create({
            reseller_id: RESELLER_ID,
            name: `e2e ${name} ${suffix}`,
            description: 'e2e',
        }).save()
        packageIds.push(pkg.id)
        await appService.db.getRepository(db.billing.PackageProfileSet).insert({
            package_id: pkg.id,
            discriminator: Discriminator.Initial,
            profile_id: profileId,
        })
        return pkg.id
    }

    const createContract = async (mappings: Mapping[], createdAt = at(0), profilePackageId?: number): Promise<number> => {
        const contract = await db.billing.Contract.create({
            contact_id: CONTACT_ID,
            product_id: SIPACCOUNT_PRODUCT_ID,
            status: ContractStatus.Active,
            profile_package_id: profilePackageId,
            create_timestamp: createdAt,
            modify_timestamp: createdAt,
        }).save()
        fixtureContractIds.push(contract.id)
        if (mappings.length) {
            const csv = mappings.map(m => [
                m.start ? toLocalDateTime(m.start) : '',
                m.end ? toLocalDateTime(m.end) : '',
                m.profileId,
                m.networkId ?? '',
                ';',
            ].join(',')).join('')
            await appService.db.query('call billing.schedule_contract_billing_profile_network(?,?,?)', [contract.id, null, csv])
        }
        return contract.id
    }

    const readMappings = (contractId: number): Promise<db.billing.ContractBillingProfileNetwork[]> =>
        db.billing.ContractBillingProfileNetwork.find({where: {contract_id: contractId}, order: {id: 'ASC'}})

    const putProfiles = (contractId: number, billingProfiles: object[]): request.Test =>
        request(app.getHttpServer())
            .put(`/api/customers/${contractId}`)
            .set(...authHeader)
            .set('Accept', 'application/json')
            .set('Content-Type', 'application/json')
            .send({
                contact_id: CONTACT_ID,
                status: ContractStatus.Active,
                type: CustomerType.SipAccount,
                billing_profile_definition: ContractBillingProfileDefinition.Profiles,
                billing_profiles: billingProfiles,
            })


    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CustomerModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)
        repo = moduleRef.get<CustomerMariadbRepository>(CustomerMariadbRepository)

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

        const resellerContract = await db.billing.Contract.create({
            product_id: RESELLER_PRODUCT_ID,
            status: ContractStatus.Active,
        }).save()
        otherResellerContractId = resellerContract.id
        const reseller = await db.billing.Reseller.create({
            contract_id: resellerContract.id,
            name: `e2e billing ${suffix}`,
        }).save()
        otherResellerId = reseller.id

        profileA = await createProfile('A', RESELLER_ID)
        profileB = await createProfile('B', RESELLER_ID)
        profileC = await createProfile('C', RESELLER_ID)
        profileTerminated = await createProfile('terminated', RESELLER_ID, BillingProfileStatus.Terminated)
        profileNoReseller = await createProfile('no reseller', null)
        profileOtherReseller = await createProfile('other reseller', otherResellerId)

        const network = await db.billing.BillingNetwork.create({
            reseller_id: RESELLER_ID,
            name: `e2e network ${suffix}`,
            description: 'e2e',
        }).save()
        networkIds.push(network.id)
        networkA = network.id
        const terminatedNetwork = await db.billing.BillingNetwork.create({
            reseller_id: RESELLER_ID,
            name: `e2e terminated network ${suffix}`,
            description: 'e2e',
            status: BillingNetworkStatus.Terminated,
        }).save()
        networkIds.push(terminatedNetwork.id)
        networkTerminated = terminatedNetwork.id

        for (const [field, resellerId, templates] of [
            ['subscriber_email_template_id', RESELLER_ID, ownTemplates],
            ['passreset_email_template_id', RESELLER_ID, ownTemplates],
            ['invoice_email_template_id', RESELLER_ID, ownTemplates],
            ['subscriber_email_template_id', otherResellerId, foreignTemplates],
            ['passreset_email_template_id', otherResellerId, foreignTemplates],
            ['invoice_email_template_id', otherResellerId, foreignTemplates],
        ] as [string, number, {[key: string]: number}][]) {
            const template = await db.billing.EmailTemplate.create({
                reseller_id: resellerId, name: `e2e_${field}_${suffix}`, from_email: 'e2e@example.org', subject: 'e2e', body: 'e2e',
            }).save()
            emailTemplateIds.push(template.id)
            templates[field] = template.id
        }
        for (const [resellerId, templates] of [[RESELLER_ID, ownTemplates], [otherResellerId, foreignTemplates]] as [number, {[key: string]: number}][]) {
            const template = await db.billing.InvoiceTemplate.create({reseller_id: resellerId, name: `e2e invoice ${suffix}`}).save()
            invoiceTemplateIds.push(template.id)
            templates['invoice_template_id'] = template.id
        }

        packageA = await createPackage('package A', profileA)
        packageB = await createPackage('package B', profileB)
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
            .auth(creds.username, creds.password)
            .set('Accept', 'application/json')
        expect(response.status).toEqual(201)
        expect(response.body['access_token']).toBeDefined()
        authHeader = ['Authorization', 'Bearer ' + response.body['access_token']]
    })

    describe('', () => { // main tests block
        describe('Customer billing profile at a given time', () => {
            let contractId: number

            beforeAll(async () => {
                contractId = await createContract([
                    {profileId: profileA},
                    {profileId: profileB, start: at(10 * DAY)},
                ])
            })

            it('returns the current profile, not a future one', async () => {
                const profile = await repo.readActualBillingProfile(contractId)
                expect(profile.id).toEqual(profileA)
            })

            it('returns the profile active at the given time', async () => {
                const profile = await repo.readActualBillingProfile(contractId, at(11 * DAY))
                expect(profile.id).toEqual(profileB)
            })

            it('clamps the time to the contract creation', async () => {
                const id = await createContract([
                    {profileId: profileA},
                    {profileId: profileB, start: at(-2 * DAY)},
                ], at(-DAY))
                const profile = await repo.readActualBillingProfile(id, at(-5 * DAY))
                expect(profile.id).toEqual(profileB)
            })

            it('returns nothing without billing mappings', async () => {
                const id = await createContract([])
                await expect(repo.readActualBillingProfile(id)).resolves.toBeUndefined()
                // a customer without mappings breaks GET /customers
                await db.billing.Contract.delete(id)
                fixtureContractIds.splice(fixtureContractIds.indexOf(id), 1)
            })
        })

        describe('Customer PUT billing mappings, id mode', () => {
            it('keeps future mappings and starts the new profile now (local time)', async () => {
                const future = at(10 * DAY)
                const contractId = await createContract([
                    {profileId: profileA},
                    {profileId: profileC, start: future},
                ])
                const before = at(0)
                const response = await request(app.getHttpServer())
                    .put(`/api/customers/${contractId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        contact_id: CONTACT_ID,
                        status: ContractStatus.Active,
                        type: CustomerType.SipAccount,
                        billing_profile_definition: ContractBillingProfileDefinition.ID,
                        billing_profile_id: profileB,
                    })
                expect(response.status).toEqual(HttpStatus.NO_CONTENT)

                const mappings = await readMappings(contractId)
                const futureMapping = mappings.find(m => m.billing_profile_id == profileC)
                expect(futureMapping?.start_date?.getTime()).toEqual(future.getTime())
                const newMapping = mappings.find(m => m.billing_profile_id == profileB)
                expect(newMapping).toBeDefined()
                expect(Math.abs(newMapping.start_date.getTime() - before.getTime())).toBeLessThan(60 * 1000)
            })

            it('rejects a terminated billing profile with 422', async () => {
                const contractId = await createContract([{profileId: profileA}])
                const response = await request(app.getHttpServer())
                    .put(`/api/customers/${contractId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        contact_id: CONTACT_ID,
                        status: ContractStatus.Active,
                        type: CustomerType.SipAccount,
                        billing_profile_definition: ContractBillingProfileDefinition.ID,
                        billing_profile_id: profileTerminated,
                    })
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                expect(response.body.errors.map((e: ErrorEntry) => [e.pointer, e.code])).toEqual([
                    ['/billing_profile_id', 'BILLING_PROFILE_ALREADY_TERMINATED'],
                ])
            })
        })

        describe('Customer PUT billing mappings, package mode', () => {
            const putPackage = (contractId: number, packageId?: number): request.Test =>
                request(app.getHttpServer())
                    .put(`/api/customers/${contractId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        contact_id: CONTACT_ID,
                        status: ContractStatus.Active,
                        type: CustomerType.SipAccount,
                        billing_profile_definition: ContractBillingProfileDefinition.Package,
                        profile_package_id: packageId,
                    })

            it('keeps future mappings when the package changes', async () => {
                const future = at(10 * DAY)
                const contractId = await createContract([
                    {profileId: profileA},
                    {profileId: profileC, start: future},
                ], at(0), packageA)
                const response = await putPackage(contractId, packageB)
                expect(response.status).toEqual(HttpStatus.NO_CONTENT)

                const mappings = await readMappings(contractId)
                expect(mappings.find(m => m.billing_profile_id == profileC)?.start_date?.getTime()).toEqual(future.getTime())
                expect(mappings.find(m => m.billing_profile_id == profileB)).toBeDefined()
            })
        })

        describe('Customer PUT billing mappings, profiles mode', () => {
            let contractId: number

            beforeAll(async () => {
                contractId = await createContract([{profileId: profileA}])
            })

            it('stores dated intervals in local time', async () => {
                const start = at(5 * DAY)
                const stop = at(6 * DAY)
                const response = await putProfiles(contractId, [
                    {profile_id: profileB, start: toLocalDateTime(start), stop: toLocalDateTime(stop)},
                ])
                expect(response.status).toEqual(HttpStatus.NO_CONTENT)

                const mapping = (await readMappings(contractId)).find(m => m.billing_profile_id == profileB)
                expect(mapping?.start_date?.getTime()).toEqual(start.getTime())
                expect(mapping?.end_date?.getTime()).toEqual(stop.getTime())
            })

            it('stores no network for network_id null', async () => {
                const response = await putProfiles(contractId, [
                    {profile_id: profileB, network_id: null, start: toLocalDateTime(at(5 * DAY)), stop: null},
                ])
                expect(response.status).toEqual(HttpStatus.NO_CONTENT)

                const mapping = (await readMappings(contractId)).find(m => m.billing_profile_id == profileB)
                expect(mapping).toBeDefined()
                expect(mapping.billing_network_id).toBeNull()
            })

            it('accepts a billing profile without reseller', async () => {
                const response = await putProfiles(contractId, [
                    {profile_id: profileNoReseller, start: toLocalDateTime(at(5 * DAY))},
                ])
                expect(response.status).toEqual(HttpStatus.NO_CONTENT)
            })

            it('accepts a network of the reseller', async () => {
                const response = await putProfiles(contractId, [
                    {profile_id: profileB, network_id: networkA, start: toLocalDateTime(at(5 * DAY))},
                ])
                expect(response.status).toEqual(HttpStatus.NO_CONTENT)
            })

            // the failing profile is the second one, the pointer names it and its field (request names: profile_id, start, stop)
            it.each([
                ['a start in the past', (): object => ({profile_id: profileB, start: toLocalDateTime(at(-DAY))}), '/start', 'START_DATE_NOT_IN_FUTURE'],
                ['an open interval', (): object => ({profile_id: profileB}), '', 'OPEN_INTERVAL_MAPPING_NOT_ALLOWED'],
                ['a stop without start', (): object => ({profile_id: profileB, stop: toLocalDateTime(at(5 * DAY))}), '/start', 'NO_START_DATE_WITH_PROVIDED_END_DATE'],
                ['a terminated billing profile', (): object => ({profile_id: profileTerminated, start: toLocalDateTime(at(5 * DAY))}), '/profile_id', 'BILLING_PROFILE_ALREADY_TERMINATED'],
                ['a billing profile of another reseller', (): object => ({profile_id: profileOtherReseller, start: toLocalDateTime(at(5 * DAY))}), '/profile_id', 'CONTACT_AND_BILLING_PROFILE_RESELLER_ID_MISMATCH'],
                ['an unknown billing profile', (): object => ({profile_id: 999999999, start: toLocalDateTime(at(5 * DAY))}), '/profile_id', 'INVALID_BILLING_PROFILE_ID'],
                ['an unknown network', (): object => ({profile_id: profileB, network_id: 999999999, start: toLocalDateTime(at(5 * DAY))}), '/network_id', 'INVALID_BILLING_NETWORK_ID'],
            ])('rejects %s with 422', async (_name, profile, field, code) => {
                const response = await putProfiles(contractId, [{profile_id: profileB, start: toLocalDateTime(at(5 * DAY))}, profile()])
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                expect(response.body.errorCode).toEqual(code)
                expect(response.body.errors.map((e: ErrorEntry) => [e.pointer, e.code])).toEqual([[`/billing_profiles/1${field}`, code]])
            })
        })

        describe('Customer billing profile lists', () => {
            let contractId: number

            const getList = (path: string): request.Test =>
                request(app.getHttpServer())
                    .get(`/api/customers/${contractId}/${path}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')

            beforeAll(async () => {
                contractId = await createContract([
                    {profileId: profileA},
                    {profileId: profileB, start: at(5 * DAY), end: at(6 * DAY)},
                    {profileId: profileTerminated, start: at(8 * DAY)},
                    {profileId: profileC, networkId: networkTerminated, start: at(9 * DAY)},
                ])
            })

            it('lists whole-second schedules ordered by effective start time, without terminated profiles/networks', async () => {
                const response = await getList('@billing-profiles')
                expect(response.status).toEqual(HttpStatus.OK)
                const {data: profiles, total_count: count} = response.body
                expect(count).toEqual(profiles.length)
                const ids = profiles.map((p: {profile_id: number}) => p.profile_id)
                expect(ids).toEqual(expect.arrayContaining([profileA, profileB]))
                expect(ids).not.toContain(profileTerminated)
                expect(ids).not.toContain(profileC)
                const times = profiles.map((p: {effective_start_time: string}) => new Date(p.effective_start_time).getTime())
                expect(times.every((t: number) => t % 1000 == 0)).toBe(true)
                expect(times).toEqual([...times].sort((a, b) => a - b))
            })

            it('lists only future billing profiles', async () => {
                const response = await getList('@future-billing-profiles')
                expect(response.status).toEqual(HttpStatus.OK)
                const {data: profiles, total_count: count} = response.body
                expect(count).toEqual(profiles.length)
                expect(profiles.map((p: {profile_id: number}) => p.profile_id)).toEqual([profileB])
            })

            it('derives billing_profile_definition id without terminated profiles', async () => {
                const id = await createContract([
                    {profileId: profileA},
                    {profileId: profileTerminated, start: at(8 * DAY)},
                ])
                const response = await request(app.getHttpServer())
                    .get(`/api/customers/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.billing_profile_definition).toEqual(ContractBillingProfileDefinition.ID)
            })
        })

        describe('Customer PATCH billing mappings, profiles mode', () => {
            it('patches billing_profiles with dated intervals', async () => {
                const contractId = await createContract([{profileId: profileA}])
                const start = at(5 * DAY)
                const response = await request(app.getHttpServer())
                    .patch(`/api/customers/${contractId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([
                        {op: 'replace', path: '/billing_profile_definition', value: ContractBillingProfileDefinition.Profiles},
                        {op: 'remove', path: '/billing_profile_id'},
                        {op: 'add', path: '/billing_profiles', value: [
                            {profile_id: profileB, network_id: null, start: toLocalDateTime(start), stop: null},
                        ]},
                    ])
                expect(response.status).toEqual(HttpStatus.NO_CONTENT)

                const mapping = (await readMappings(contractId)).find(m => m.billing_profile_id == profileB)
                expect(mapping?.start_date?.getTime()).toEqual(start.getTime())
            })
        })

        describe('Customer POST billing mappings, profiles mode', () => {
            it('requires an open interval without network', async () => {
                const mappingWhere = {billing_profile_id: profileA, billing_network_id: networkA}
                const mappingsBefore = await db.billing.ContractBillingProfileNetwork.countBy(mappingWhere)
                const response = await request(app.getHttpServer())
                    .post('/api/customers')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        contact_id: CONTACT_ID,
                        status: ContractStatus.Active,
                        type: CustomerType.SipAccount,
                        billing_profile_definition: ContractBillingProfileDefinition.Profiles,
                        billing_profiles: [{profile_id: profileA, network_id: networkA, start: null, stop: null}],
                    })
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                expect(response.body.errors.map((e: ErrorEntry) => [e.pointer, e.code])).toEqual([
                    ['/billing_profiles', 'INITIAL_OPEN_INTERVAL_REQUIRED'],
                ])
                expect(await db.billing.ContractBillingProfileNetwork.countBy(mappingWhere)).toEqual(mappingsBefore)
            })
        })

        describe('Customer POST business errors', () => {
            const valid = (): object => ({
                contact_id: CONTACT_ID,
                status: ContractStatus.Active,
                type: CustomerType.SipAccount,
                billing_profile_definition: ContractBillingProfileDefinition.Profiles,
                billing_profiles: [{profile_id: profileA}],
            })
            const post = (body: object): request.Test => request(app.getHttpServer())
                .post('/api/customers')
                .set(...authHeader)
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send(body)

            it('points to the failing items of a bulk POST only', async () => {
                const response = await post([valid(), {...valid(), contact_id: 999999999}])
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                expect(response.body.errorCode).toEqual('INVALID_CONTACT_ID')
                expect(response.body.errors.map((e: ErrorEntry) => [e.pointer, e.code])).toEqual([['/1/contact_id', 'INVALID_CONTACT_ID']])
            })
            it('reports every failing item with its own code, the first one as errorCode', async () => {
                const response = await post([
                    {...valid(), billing_profiles: [{profile_id: 999999999}]},
                    valid(),
                    {...valid(), billing_profiles: [{profile_id: profileA}, {profile_id: profileB, start: toLocalDateTime(at(-DAY))}]},
                ])
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                expect(response.body.errorCode).toEqual('INVALID_BILLING_PROFILE_ID')
                expect(response.body.errors.map((e: ErrorEntry) => [e.pointer, e.code])).toEqual([
                    ['/0/billing_profiles/0/profile_id', 'INVALID_BILLING_PROFILE_ID'],
                    ['/2/billing_profiles/1/start', 'START_DATE_NOT_IN_FUTURE'],
                ])
            })
        })

        describe('Customer POST', () => {
            it('create a single Customer with billing_profile_definition profiles', async () => {
                const customer: CustomerPost = {
                    'type': CustomerType.SipAccount,
                    'contact_id': 1,
                    'max_subscribers': null,
                    'status': CustomerStatus.Active,
                    'external_id': null,
                    'vat_rate': 0,
                    'add_vat': false,
                    'subscriber_email_template_id': null,
                    'passreset_email_template_id': null,
                    'invoice_email_template_id': null,
                    'invoice_template_id': null,
                    'billing_profile_definition': ContractBillingProfileDefinition.Profiles,
                    'billing_profiles': [
                        {
                            'profile_id': 1,
                            'network_id': null,
                            'start': null,
                            'stop': null,
                        },
                    ],
                }

                const response = await request(app.getHttpServer())
                    .post('/api/customers')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send(customer)
                expect(response.status).toEqual(HttpStatus.CREATED)
                createdCustomerIds.push(+response.body.data[0].id)
            })

            it('create a single Customer with billing_profile_definition_id', async () => {
                const customer: CustomerPost = {
                    type: CustomerType.SipAccount,
                    contact_id: 1,
                    max_subscribers: null,
                    status: CustomerStatus.Active,
                    external_id: null,
                    vat_rate: 0,
                    add_vat: false,
                    subscriber_email_template_id: null,
                    passreset_email_template_id: null,
                    invoice_email_template_id: null,
                    invoice_template_id: null,
                    billing_profile_definition: ContractBillingProfileDefinition.ID,
                    billing_profile_id: 1,
                }

                const response = await request(app.getHttpServer())
                    .post('/api/customers')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send(customer)
                expect(response.status).toEqual(HttpStatus.CREATED)
                createdCustomerIds.push(+response.body.data[0].id)
            })

            it('fail if both billing_profiles and billing_profile_id are set', async () => {
                const customer: CustomerPost = {
                    add_vat: true,
                    contact_id: 1,
                    billing_profile_id: 1,
                    status: CustomerStatus.Active,
                    type: CustomerType.PbxAccount,
                    billing_profile_definition: ContractBillingProfileDefinition.ID,
                    billing_profiles: [
                        {
                            'profile_id': 1,
                            'network_id': null,
                            'start': null,
                            'stop': null,
                        },
                    ],
                }

                const response = await request(app.getHttpServer())
                    .post('/api/customers')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send(customer)
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
            })
        })

        describe('Customer GET', () => {
            it('read single created customer by id', async () => {
                const id = createdCustomerIds[0]
                const response = await request(app.getHttpServer())
                    .get(`/api/customers/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(HttpStatus.OK)
                const customerRes: CustomerResponseDto = response.body
                expect(await validate(customerRes)).toHaveLength(0)
                expect(customerRes.id).toEqual(id)
            })

            it('read collection', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/customers')
                    .query({id: createdCustomerIds[0]})
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(HttpStatus.OK)
                const {data: customers, total_count: count} = response.body
                expect(count).toBeGreaterThan(0)
                expect(customers.length).toBeGreaterThan(0)
                for (const customer of customers) {
                    expect(await validate(customer)).toHaveLength(0)
                }
            })

            it('read non-existing customer', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/customers/999999')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(HttpStatus.NOT_FOUND)
            })
        })

        describe('Customer PATCH', () => {
            it('patch single customer name and vat_rate', async () => {
                const id = createdCustomerIds[0]
                const patch = [
                    {op: 'replace', path: '/external_id', value: 'patched-external-id'},
                    {op: 'replace', path: '/vat_rate', value: 0.27},
                ]
                const response = await request(app.getHttpServer())
                    .patch(`/api/customers/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .set('Prefer', 'return=representation')
                    .send(patch)
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.external_id).toEqual('patched-external-id')
                expect(Number(response.body.vat_rate)).toBeCloseTo(0.27)
            })

            it('patch non-existing customer', async () => {
                const patch = [
                    {op: 'replace', path: '/external_id', value: 'should-not-exist'},
                ]
                const response = await request(app.getHttpServer())
                    .patch('/api/customers/999999')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(HttpStatus.NOT_FOUND)
            })

            it('patch with invalid field', async () => {
                const id = createdCustomerIds[0]
                const patch = [
                    {op: 'replace', path: '/nonexistent_field', value: 'foo'},
                ]
                const response = await request(app.getHttpServer())
                    .patch(`/api/customers/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
            })

            it('patch with business rule error (both billing_profile_id and billing_profiles)', async () => {
                const id = createdCustomerIds[0]
                const patch = [
                    {op: 'replace', path: '/billing_profile_id', value: 1},
                    {op: 'replace', path: '/billing_profiles', value: [{profile_id: 1, network_id: null, start: null, stop: null}]},
                    {op: 'replace', path: '/billing_profile_definition', value: 'id'},
                ]
                const response = await request(app.getHttpServer())
                    .patch(`/api/customers/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
            })

            it('patch bulk customers (success)', async () => {
                if (createdCustomerIds.length < 2) return // skip if not enough
                const patchDict = {}
                patchDict[createdCustomerIds[0]] = [
                    {op: 'replace', path: '/external_id', value: 'bulk-patch-1'},
                ]
                patchDict[createdCustomerIds[1]] = [
                    {op: 'replace', path: '/external_id', value: 'bulk-patch-2'},
                ]
                const response = await request(app.getHttpServer())
                    .patch('/api/customers')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .set('Prefer', 'return=representation')
                    .send(patchDict)
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.data).toContain(createdCustomerIds[0])
                expect(response.body.data).toContain(createdCustomerIds[1])
            })
        })

        describe('Customer PUT', () => {
            it('put single customer (success)', async () => {
                const id = createdCustomerIds[0]
                const putDto = {
                    add_vat: true,
                    contact_id: 1,
                    status: CustomerStatus.Active,
                    type: CustomerType.SipAccount,
                    vat_rate: 0.19,
                    billing_profile_definition: ContractBillingProfileDefinition.ID,
                    billing_profile_id: 1,
                }
                const response = await request(app.getHttpServer())
                    .put(`/api/customers/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send(putDto)
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.id).toEqual(id)
                expect(response.body.add_vat).toBe(true)
                expect(Number(response.body.vat_rate)).toBeCloseTo(0.19)
            })

            it('put non-existing customer', async () => {
                const putDto = {
                    add_vat: true,
                    contact_id: 1,
                    status: CustomerStatus.Active,
                    type: CustomerType.SipAccount,
                    vat_rate: 0.19,
                    billing_profile_definition: ContractBillingProfileDefinition.ID,
                    billing_profile_id: 1,
                }
                const response = await request(app.getHttpServer())
                    .put('/api/customers/999999')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(putDto)
                expect(response.status).toEqual(HttpStatus.NOT_FOUND)
            })

            it('put with business rule error (both billing_profile_id and billing_profiles)', async () => {
                const id = createdCustomerIds[0]
                const putDto = {
                    add_vat: true,
                    contact_id: 1,
                    status: CustomerStatus.Active,
                    type: CustomerType.SipAccount,
                    vat_rate: 0.19,
                    billing_profile_definition: ContractBillingProfileDefinition.ID,
                    billing_profile_id: 1,
                    billing_profiles: [
                        {profile_id: 1, network_id: null, start: null, stop: null},
                    ],
                }
                const response = await request(app.getHttpServer())
                    .put(`/api/customers/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(putDto)
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
            })

            it('put bulk customers (success)', async () => {
                if (createdCustomerIds.length < 2) return // skip if not enough
                const putDict = {}
                putDict[createdCustomerIds[0]] = {
                    add_vat: false,
                    contact_id: 1,
                    status: CustomerStatus.Active,
                    type: CustomerType.SipAccount,
                    vat_rate: 0.15,
                    billing_profile_definition: ContractBillingProfileDefinition.ID,
                    billing_profile_id: 1,
                }
                putDict[createdCustomerIds[1]] = {
                    add_vat: true,
                    contact_id: 1,
                    status: CustomerStatus.Active,
                    type: CustomerType.PbxAccount,
                    vat_rate: 0.25,
                    billing_profile_definition: ContractBillingProfileDefinition.ID,
                    billing_profile_id: 1,
                }
                const response = await request(app.getHttpServer())
                    .put('/api/customers')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send(putDict)
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.data).toContain(createdCustomerIds[0])
                expect(response.body.data).toContain(createdCustomerIds[1])
            })
        })

        describe('Customer email and invoice templates', () => {
            const templateFields = ['subscriber_email_template_id', 'passreset_email_template_id', 'invoice_email_template_id', 'invoice_template_id']
            let templateCustomerId: number
            const customerOf = (templates: {[key: string]: number}): CustomerPost => ({
                type: CustomerType.SipAccount,
                contact_id: CONTACT_ID,
                status: CustomerStatus.Active,
                vat_rate: 0,
                add_vat: false,
                billing_profile_definition: ContractBillingProfileDefinition.ID,
                billing_profile_id: profileA,
                ...templates,
            })

            it('create a customer with templates of the contact reseller', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/customers')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send(customerOf(ownTemplates))
                expect(response.status).toEqual(HttpStatus.CREATED)
                templateCustomerId = +response.body.data[0].id
                createdCustomerIds.push(templateCustomerId)
                for (const field of templateFields)
                    expect(response.body.data[0][field]).toEqual(ownTemplates[field])
            })
            it.each(templateFields)('reject a %s of another reseller or unknown on POST', async field => {
                for (const id of [foreignTemplates[field], 4294967]) {
                    const response = await request(app.getHttpServer())
                        .post('/api/customers')
                        .set(...authHeader)
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send(customerOf({...ownTemplates, [field]: id}))
                    expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                    expect(response.body.errors.map((e: ErrorEntry) => [e.pointer, e.code])).toEqual([
                        [`/${field}`, field == 'invoice_template_id' ? 'INVOICE_TEMPLATE_NOT_FOUND' : 'EMAIL_TEMPLATE_NOT_FOUND'],
                    ])
                }
            })
            it.each(templateFields)('reject a %s of another reseller on PATCH', async field => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/customers/${templateCustomerId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: `/${field}`, value: foreignTemplates[field]}])
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
                const contract = await db.billing.Contract.findOneByOrFail({id: templateCustomerId})
                expect(contract[field]).toEqual(ownTemplates[field])
            })
        })

        describe('Customer DELETE', () => {
            it('terminate customer by id', async () => {
                const id = createdCustomerIds[0]
                const response = await request(app.getHttpServer())
                    .delete(`/api/customers/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Prefer', 'return=representation')
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.data).toContain(id)
                const softDelete = await db.billing.Contract.findOne({
                    where: {
                        id,
                    },
                })
                expect(softDelete.status).toEqual(ContractStatus.Terminated)
            })
        })
    })

    describe('CustomerController DELETE', () => {
        it('delete created customers and fixtures', async () => {
            const contractIds = [...createdCustomerIds, ...fixtureContractIds]
            if (contractIds.length)
                await db.billing.Journal.delete({resource_name: 'customers', resource_id: In(contractIds)})
            if (createdCustomerIds.length)
                await db.billing.Contract.delete(createdCustomerIds)
            if (fixtureContractIds.length)
                await db.billing.Contract.delete(fixtureContractIds)
            if (emailTemplateIds.length)
                await db.billing.EmailTemplate.delete(emailTemplateIds)
            if (invoiceTemplateIds.length)
                await db.billing.InvoiceTemplate.delete(invoiceTemplateIds)
            if (packageIds.length) {
                await appService.db.getRepository(db.billing.PackageProfileSet).delete({package_id: In(packageIds)})
                await db.billing.ProfilePackage.delete(packageIds)
            }
            if (networkIds.length)
                await db.billing.BillingNetwork.delete(networkIds)
            if (profileIds.length)
                await db.billing.BillingProfile.delete(profileIds)
            if (otherResellerId)
                await db.billing.Reseller.delete(otherResellerId)
            if (otherResellerContractId)
                await db.billing.Contract.delete(otherResellerContractId)
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})
