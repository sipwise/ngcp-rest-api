import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import {validate} from 'class-validator'
import request from 'supertest'

import {CustomerSpeedDialModule} from './customer-speed-dial.module'
import {CustomerSpeedDialResponseDto} from './dto/customer-speed-dial-response.dto'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {ResponseValidationInterceptor} from '~/interceptors/validate.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

type CustomerSpeedDialPost = {
    customer_id: number
    slot: string
    destination: string
}

describe('CustomerSpeedDial', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    const testCustomerId = 13
    let createdIds: number[] = []
    let createdEntries = []
    const creds = {username: 'administrator', password: 'administrator'}

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CustomerSpeedDialModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        createdIds = []

        app = moduleRef.createNestApplication()

        // TODO import other app configuration from bootstrap()
        // like interceptors, etc.
        app.useGlobalPipes(new ValidateInputPipe())
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
        describe('POST', () => {
            const csd1: CustomerSpeedDialPost = {
                customer_id: testCustomerId,
                slot: '*1',
                destination: '4310001',
            }
            const csd2: CustomerSpeedDialPost = {
                customer_id: testCustomerId,
                slot: '*2',
                destination: '4310002',
            }
            it('create customer speed dial *1', async () => {
                const response = await request(app.getHttpServer())
                    .post('/customerspeeddials')
                    .set(...authHeader)
                    .send(csd1)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.id)
            })
            it('create customer speed dial *2', async () => {
                const response = await request(app.getHttpServer())
                    .post('/customerspeeddials')
                    .set(...authHeader)
                    .send(csd2)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.id)
            })
            it('fail duplicate customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .post('/customerspeeddials')
                    .set(...authHeader)
                    .send(csd1)
                expect(response.status).toEqual(422)
            })
            it('validation fail customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .post('/customerspeeddials')
                    .set(...authHeader)
                    .send({customer_id: testCustomerId})
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read created customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/customerspeeddials/?customer_id=${testCustomerId}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const csdCollection: CustomerSpeedDialResponseDto = response.body
                expect(await validate(csdCollection)).toEqual([])
                expect(csdCollection).toHaveLength(2)
                expect(csdCollection[1]).toEqual(2)
                const csdEntries = csdCollection[0]
                expect(await validate(csdEntries)).toEqual([])
                expect(csdEntries).toHaveLength(2)
                expect(csdEntries[0].customer_id).toEqual(testCustomerId)
                expect(csdEntries[0].slot).toEqual('*1')
                expect(csdEntries[0].destination).toMatch(RegExp('^sip:4310001@'))
                expect(csdEntries[0].customer_id).toEqual(testCustomerId)
                expect(csdEntries[1].slot).toEqual('*2')
                expect(csdEntries[1].destination).toMatch(RegExp('^sip:4310002@'))
                createdEntries = csdEntries
            })
            it('read non-existing customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .get('/customerspeeddials/9999111111')
                    .set(...authHeader)
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            const csd1: CustomerSpeedDialPost = {
                customer_id: testCustomerId,
                slot: '*3',
                destination: '4310003',
            }
            const csd2: CustomerSpeedDialPost = {
                customer_id: testCustomerId,
                slot: '*4',
                destination: '4310004',
            }
            it('update customer speed dial *1 -> *3', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/customerspeeddials/${createdEntries[0]['id']}`)
                    .set(...authHeader)
                    .send(csd1)
                expect(response.status).toEqual(200)
            })
            it('update customer speed dial *2 -> *4', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/customerspeeddials/${createdEntries[1]['id']}`)
                    .set(...authHeader)
                    .send(csd2)
                expect(response.status).toEqual(200)
            })
            it('read adjusted customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/customerspeeddials/?customer_id=${testCustomerId}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const csdCollection: CustomerSpeedDialResponseDto = response.body
                expect(await validate(csdCollection)).toEqual([])
                expect(csdCollection).toHaveLength(2)
                expect(csdCollection[1]).toEqual(2)
                const csdEntries = csdCollection[0]
                expect(await validate(csdEntries)).toEqual([])
                expect(csdEntries).toHaveLength(2)
                expect(csdEntries[0].customer_id).toEqual(testCustomerId)
                expect(csdEntries[0].slot).toEqual('*3')
                expect(csdEntries[0].destination).toMatch(RegExp('^sip:4310003@'))
                expect(csdEntries[0].customer_id).toEqual(testCustomerId)
                expect(csdEntries[1].slot).toEqual('*4')
                expect(csdEntries[1].destination).toMatch(RegExp('^sip:4310004@'))
            })
            it('update non-existing customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .put('/customerspeeddials/999911111122')
                    .set(...authHeader)
                    .send(csd1)
                expect(response.status).toEqual(404)
            })
        })

        describe('PATCH', () => {
            const patch: PatchOperation[] = [
                {
                    op: 'replace',
                    path: '/slot',
                    value: '*5',
                },
                {
                    op: 'replace',
                    path: '/destination',
                    value: '4310005',
                },
            ]
            it('adjust customer speed dial *3 -> *5', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/customerspeeddials/${createdEntries[0]['id']}`)
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(200)
            })
            it('read updated customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/customerspeeddials/?customer_id=${testCustomerId}&slot=%2A5`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const csdCollection: CustomerSpeedDialResponseDto = response.body
                expect(await validate(csdCollection)).toEqual([])
                expect(csdCollection).toHaveLength(2)
                expect(csdCollection[1]).toEqual(1)
                const csdEntries = csdCollection[0]
                expect(await validate(csdEntries)).toEqual([])
                expect(csdEntries).toHaveLength(1)
                expect(csdEntries[0].customer_id).toEqual(testCustomerId)
                expect(csdEntries[0].slot).toEqual('*5')
                expect(csdEntries[0].destination).toMatch(RegExp('^sip:4310005@'))
            })
            it('adjust non-existing customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/customerspeeddials/999991111112')
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('CustomerSpeedDial DELETE', () => {
        it('delete created customer speed dial', async () => {
            for (const id of createdIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/customerspeeddials/${id}`)
                    .set(...authHeader)
                expect(result.status).toEqual(200)
            }
        })
    })
})