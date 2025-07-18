import {HttpStatus, INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import {validate} from 'class-validator'
import request from 'supertest'

import {CustomerModule} from './customer.module'
import {CustomerResponseDto} from './dto/customer-response.dto'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {db} from '~/entities'
import {ContractBillingProfileDefinition, ContractStatus, ContractStatus as CustomerStatus} from '~/entities/internal/contract.internal.entity'
import {CustomerType} from '~/entities/internal/customer.internal.entity'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {ResponseValidationInterceptor} from '~/interceptors/validate.interceptor'
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

describe('CustomerController', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    const preferHeader: [string, string] = ['prefer', 'return=representation']
    let createdCustomerIds: number[] = []
    let _createdContactIds: number[] = []
    let _createdBillingProfileIds: number[] = []
    const creds = {username: 'administrator', password: 'administrator'}

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CustomerModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        createdCustomerIds = []
        _createdContactIds = []
        _createdBillingProfileIds = []

        app = moduleRef.createNestApplication()

        app.useGlobalPipes(new ValidateInputPipe({whitelist: true, forbidNonWhitelisted: true, transform: true}))
        app.useGlobalFilters(new HttpExceptionFilter())
        app.useGlobalInterceptors(new ResponseValidationInterceptor())

        await app.init()
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
            .send(creds)
        expect(response.status).toEqual(201)
        expect(response.body['access_token']).toBeDefined()
        authHeader = ['Authorization', 'Bearer ' + response.body['access_token']]
    })

    describe('', () => { // main tests block
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

                // now actually delete all 
                for (const id of createdCustomerIds) {
                    await db.billing.Contract.delete(id)
                }
            })
        })
    })
})
