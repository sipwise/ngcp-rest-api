import {HttpStatus, INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import {validate} from 'class-validator'
import request from 'supertest'

import {CustomerModule} from './customer.module'
import {CustomerRequestDto} from './dto/customer-request.dto'
import {CustomerResponseDto} from './dto/customer-response.dto'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {internal} from '~/entities'
import {ContractStatus as CustomerStatus} from '~/entities/internal/contract.internal.entity'
import {CustomerType} from '~/entities/internal/customer.internal.entity'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

describe('CustomerController', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    const preferHeader: [string, string] = ['prefer', 'return=representation']
    let createdCustomerIds: number[] = []
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let createdContractIds: number[] = []
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let createdResellerIds: number[] = []
    const creds = {username: 'administrator', password: 'administrator'}

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CustomerModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        createdCustomerIds = []
        createdContractIds = []
        createdResellerIds = []

        app = moduleRef.createNestApplication()

        // TODO import other app configuration from bootstrap()
        // like interceptors, etc.
        app.useGlobalPipes(new ValidateInputPipe({whitelist: true, forbidNonWhitelisted: true, transform: true}))
        app.useGlobalFilters(new HttpExceptionFilter())

        await app.init()
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
            it('create a single Customer', async () => {
                const intCustomer = internal.Customer.create({
                    addVat: true,
                    contactId: 1,
                    profilePackageId: 1,
                    status: CustomerStatus.Active,
                    type: CustomerType.PbxAccount,

                })
                const customer = new CustomerRequestDto(intCustomer)

                expect.assertions(1)
                const response = await request(app.getHttpServer())
                    .post('/customers')
                    .set(...authHeader)
                    .set(...preferHeader)
                    .send(customer)
                expect(response.status).toEqual(HttpStatus.CREATED)
                createdCustomerIds.push(+response.body[0].id)
            })
            it('create a Customer bulk', async () => {
                const intCustomer = internal.Customer.create({
                    addVat: true,
                    contactId: 1,
                    billingProfileId: 3,
                    status: CustomerStatus.Active,
                    type: CustomerType.SipAccount,

                })
                const customers: CustomerRequestDto[] = []
                customers.push(new CustomerRequestDto(intCustomer))
                const response = await request(app.getHttpServer())
                    .post('/customers')
                    .set(...authHeader)
                    .set(...preferHeader)
                    .send(customers)
                expect(response.status).toEqual(HttpStatus.CREATED)
                expect(response.body.length).toEqual(customers.length)
                for (const customer of response.body) {
                    const customerRes: CustomerResponseDto = customer
                    createdCustomerIds.push(+customerRes.id)
                    expect(await validate(customerRes)).toHaveLength(0)
                }
            })

            it('fail on invalid field name', async () => {
                const intCustomer = internal.Customer.create({
                    addVat: true,
                    contactId: 1,
                    profilePackageId: 1,
                    status: CustomerStatus.Active,
                    type: CustomerType.PbxAccount,

                })
                const customer = new CustomerRequestDto(intCustomer)
                customer['invalidFieldName'] = 'invalid field'
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
                // const resellerId = createdResellerIds[0]

                const response = await request(app.getHttpServer())
                    .get(`/customers/${id}`)
                    .set(...authHeader)
                    .set(...preferHeader)
                expect(response.status).toEqual(HttpStatus.OK)
                const customerRes: CustomerResponseDto = response.body
                expect(await validate(customerRes)).toHaveLength(0)
                expect(customerRes.add_vat).toBe(true)
                expect(customerRes.contact_id).toEqual(1)
                expect(customerRes.profile_package_id).toEqual(1)
                expect(customerRes.status).toEqual(CustomerStatus.Active)
                expect(customerRes.type).toEqual(CustomerType.PbxAccount)
            })
            it('read collection', async () => {
                const response = await request(app.getHttpServer())
                    .get('/customers')
                    .set(...authHeader)
                    .set(...preferHeader)
                expect(response.status).toEqual(HttpStatus.OK)
            })
        })

        describe('Customer PATCH', () => {
            it('patch single customer by id', async () => {
                const newStatus = CustomerStatus.Terminated
                const patch: PatchOperation[] = [
                    {op: 'replace', path: '/status', value: newStatus},
                ]
                const id = createdCustomerIds[0]
                const patchResponse = await request(app.getHttpServer())
                    .patch(`/customers/${id}`)
                    .set(...authHeader)
                    .set(...preferHeader)
                    .send(patch)
                //expect(patchResponse.body).toEqual(1)
                expect(patchResponse.status).toEqual(HttpStatus.OK)
                const customer: CustomerResponseDto = patchResponse.body
                expect(customer.status).toEqual(newStatus)
                expect(customer.id).toEqual(id)
            })

            it('fails on bad patch operation', async () => {
                const patch = [
                    {op: 'replac', path: '/status', value: 'bad operation'},
                ]
                const patchResponse = await request(app.getHttpServer())
                    .patch('/customers')
                    .set(...authHeader)
                    .set(...preferHeader)
                    .send(patch)
                expect(patchResponse.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
            })

            // TODO: Currently incorrect path does not throw an error because the RequestDto is transformed to internal
            //       before patch validation occurs
            it.skip('fails on bad patch path', async () => {
                const patch: PatchOperation[] = [
                    {op: 'replace', path: '/statu', value: 'bad value'},
                ]
                const patchResponse = await request(app.getHttpServer())
                    .patch(`/customers/${createdCustomerIds[0]}`)
                    .set(...authHeader)
                    .set(...preferHeader)
                    .send(patch)
                expect(patchResponse.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
            })
            it('fails on bad patch value', async () => {
                const patch: PatchOperation[] = [
                    {op: 'replace', path: '/status', value: 'bad value'},
                ]
                const patchResponse = await request(app.getHttpServer())
                    .patch(`/customers/${createdCustomerIds[0]}`)
                    .set(...authHeader)
                    .set(...preferHeader)
                    .send(patch)
                expect(patchResponse.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
            })

            // TODO: currently does not work; see description of single patch
            it.skip('fails on bad patch path bulk', async () => {
                const patch = {
                    1: [
                        {op: 'replace', path: '/status', value: 'bad path bulk'},
                    ],
                }
                const patchResponse = await request(app.getHttpServer())
                    .patch('/customers')
                    .set(...authHeader)
                    .set(...preferHeader)
                    .send(patch)
                expect(patchResponse.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
            })
            it('fails on bad patch operation bulk', async () => {
                const patch = {
                    1: [
                        {op: 'replac', path: '/status', value: 'bad operation'},
                    ],
                }
                const patchResponse = await request(app.getHttpServer())
                    .patch('/customers')
                    .set(...authHeader)
                    .set(...preferHeader)
                    .send(patch)
                expect(patchResponse.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
            })
        })

        describe('Customer PUT', () => {
            it('put single customer by id', async () => {
                //expect(createdCustomerIds).toEqual([1])
                const id = createdCustomerIds[1]
                const intCustomer = internal.Customer.create({
                    addVat: true,
                    contactId: 1,
                    billingProfileId: 5,
                    status: CustomerStatus.Active,
                    type: CustomerType.SipAccount,
                })
                const data = new CustomerRequestDto(intCustomer)
                const putResponse = await request(app.getHttpServer())
                    .put(`/customers/${id}`)
                    .set(...authHeader)
                    .set(...preferHeader)
                    .send(data)
                expect(putResponse.status).toEqual(HttpStatus.OK)
                expect(putResponse.body.billing_profile_id).toEqual(5)
            })
            it('terminate customer by id', async () => {
                const id = createdCustomerIds[1]
                const intCustomer = internal.Customer.create({
                    addVat: true,
                    contactId: 1,
                    status: CustomerStatus.Terminated,
                    type: CustomerType.SipAccount,
                })
                const data = new CustomerRequestDto(intCustomer)
                const response = await request(app.getHttpServer())
                    .put(`/customers/${id}`)
                    .set(...authHeader)
                    .set(...preferHeader)
                    .send(data)
                expect(response.status).toEqual(HttpStatus.OK)
            })
            it('fail on updateing terminated customer by id', async () => {
                const id = createdCustomerIds[1]
                const intCustomer = internal.Customer.create({
                    addVat: true,
                    contactId: 1,
                    status: CustomerStatus.Terminated,
                    type: CustomerType.SipAccount,
                })
                const data = new CustomerRequestDto(intCustomer)
                const response = await request(app.getHttpServer())
                    .put(`/customers/${id}`)
                    .set(...authHeader)
                    .set(...preferHeader)
                    .send(data)
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
            })
            // it('put customer bulk', async () => {

            // })
        })

        describe('Customer DELETE', () => {
            it('delete customer by id', async () => {
                const deleteResponse = await request(app.getHttpServer())
                    .delete('/customers/1')
                    .set(...authHeader)
                    .set(...preferHeader)
                expect(deleteResponse.status).toEqual(HttpStatus.NOT_FOUND)
            })
            it('delete customer bulk', async () => {
                const deleteResponse = await request(app.getHttpServer())
                    .delete('/customers')
                    .set(...authHeader)
                    .set(...preferHeader)
                    .send([1, 2, 3])
                expect(deleteResponse.status).toEqual(HttpStatus.NOT_FOUND)
            })
        })
    })
})
