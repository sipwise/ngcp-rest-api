import {HttpStatus, INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'

import {CustomerModule} from './customer.module'
import {CustomerResponseDto} from './dto/customer-response.dto'
import {CustomerMariadbRepository} from './repositories/customer.mariadb.repository'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {db} from '~/entities'
import {BillingProfileStatus} from '~/entities/internal/billing-profile.internal.entity'
import {ContractBillingProfileDefinition, ContractStatus, ContractStatus as CustomerStatus} from '~/entities/internal/contract.internal.entity'
import {CustomerType} from '~/entities/internal/customer.internal.entity'
import {toLocalDateTime} from '~/helpers/date.helper'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {validate} from '~/helpers/validate.helper'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
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

// whole seconds, as stored in DATETIME columns
const at = (offset: number): Date => new Date(Math.floor((Date.now() + offset) / 1000) * 1000)

describe('CustomerController', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    const preferHeader: [string, string] = ['prefer', 'return=representation']
    const createdCustomerIds: number[] = []
    const _createdContactIds: number[] = []
    const _createdBillingProfileIds: number[] = []
    const creds = {username: 'administrator', password: 'administrator'}
    let repo: CustomerMariadbRepository
    const suffix = `${Date.now()}`
    const fixtureContractIds: number[] = []
    const profileIds: number[] = []
    let profileA: number
    let profileB: number

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

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CustomerModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)
        repo = moduleRef.get<CustomerMariadbRepository>(CustomerMariadbRepository)

        app = moduleRef.createNestApplication()

        app.useGlobalPipes(new ValidateInputPipe({whitelist: true, forbidNonWhitelisted: true, transform: true}))
        app.useGlobalFilters(new HttpExceptionFilter())
        app.useGlobalInterceptors(new ResponseValidationInterceptor())

        await app.init()

        profileA = await createProfile('A', RESELLER_ID)
        profileB = await createProfile('B', RESELLER_ID)
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
            .post('/auth/jwt')
            .auth(creds.username, creds.password)
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
                const profile = await repo.readCurrentBillingProfile(contractId)
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

            it('throws 422 without billing mappings', async () => {
                const id = await createContract([])
                await expect(repo.readActualBillingProfile(id)).rejects.toMatchObject({status: HttpStatus.UNPROCESSABLE_ENTITY})
                // a customer without mappings breaks GET /customers
                await db.billing.Contract.delete(id)
                fixtureContractIds.splice(fixtureContractIds.indexOf(id), 1)
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
                    .post('/customers')
                    .set(...authHeader)
                    .set(...preferHeader)
                    .send(customer)
                expect(response.status).toEqual(HttpStatus.CREATED)
                createdCustomerIds.push(+response.body[0].id)
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
                    .post('/customers')
                    .set(...authHeader)
                    .set(...preferHeader)
                    .send(customer)
                expect(response.status).toEqual(HttpStatus.CREATED)
                createdCustomerIds.push(+response.body[0].id)
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
                    .post('/customers')
                    .set(...authHeader)
                    .set(...preferHeader)
                    .send(customer)
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
            })
        })

        describe('Customer GET', () => {
            it('read single created customer by id', async () => {
                const id = createdCustomerIds[0]
                const response = await request(app.getHttpServer())
                    .get(`/customers/${id}`)
                    .set(...authHeader)
                    .set(...preferHeader)
                expect(response.status).toEqual(HttpStatus.OK)
                const customerRes: CustomerResponseDto = response.body
                expect(await validate(customerRes)).toHaveLength(0)
                expect(customerRes.id).toEqual(id)
            })

            it('read collection', async () => {
                const response = await request(app.getHttpServer())
                    .get('/customers')
                    .set(...authHeader)
                    .set(...preferHeader)
                expect(response.status).toEqual(HttpStatus.OK)
                const [customers, count] = response.body
                expect(count).toBeGreaterThan(0)
                expect(customers.length).toBeGreaterThan(0)
                for (const customer of customers) {
                    expect(await validate(customer)).toHaveLength(0)
                }
            })

            it('read non-existing customer', async () => {
                const response = await request(app.getHttpServer())
                    .get('/customers/999999')
                    .set(...authHeader)
                    .set(...preferHeader)
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
                    .patch(`/customers/${id}`)
                    .set(...authHeader)
                    .set('Content-Type', 'application/json-patch+json')
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
                    .patch('/customers/999999')
                    .set(...authHeader)
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
                    .patch(`/customers/${id}`)
                    .set(...authHeader)
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
                    .patch(`/customers/${id}`)
                    .set(...authHeader)
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
                    .patch('/customers')
                    .set(...authHeader)
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patchDict)
                expect(response.status).toEqual(HttpStatus.OK)
                expect(Array.isArray(response.body)).toBe(true)
                expect(response.body).toContain(createdCustomerIds[0])
                expect(response.body).toContain(createdCustomerIds[1])
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
                    .put(`/customers/${id}`)
                    .set(...authHeader)
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
                    .put('/customers/999999')
                    .set(...authHeader)
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
                    .put(`/customers/${id}`)
                    .set(...authHeader)
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
                    .put('/customers')
                    .set(...authHeader)
                    .send(putDict)
                expect(response.status).toEqual(HttpStatus.OK)
                expect(Array.isArray(response.body)).toBe(true)
                expect(response.body).toContain(createdCustomerIds[0])
                expect(response.body).toContain(createdCustomerIds[1])
            })
        })

        describe('Customer DELETE', () => {
            it('terminate customer by id', async () => {
                const id = createdCustomerIds[0]
                const response = await request(app.getHttpServer())
                    .delete(`/customers/${id}`)
                    .set(...authHeader)
                    .set(...preferHeader)
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body).toContain(id)
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
            if (createdCustomerIds.length)
                await db.billing.Contract.delete(createdCustomerIds)
            if (fixtureContractIds.length)
                await db.billing.Contract.delete(fixtureContractIds)
            if (profileIds.length)
                await db.billing.BillingProfile.delete(profileIds)
        })
    })
})
