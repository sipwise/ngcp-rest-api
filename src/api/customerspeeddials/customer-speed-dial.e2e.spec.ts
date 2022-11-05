import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'
import {AppModule} from '../../app.module'
import {AppService} from '../../app.service'
import {AuthService} from '../../auth/auth.service'
import {CustomerSpeedDialModule} from './customer-speed-dial.module'
import {CustomerSpeedDialResponseDto} from './dto/customer-speed-dial-response.dto'
import {Operation as PatchOperation} from '../../helpers/patch.helper'
import {HttpExceptionFilter} from '../../helpers/http-exception.filter'
import {ValidateInputPipe} from '../../pipes/validate.pipe'
import {validate} from 'class-validator'

describe('CustomerSpeedDial', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let testCustomerId = 13
    let createdIds: number[] = []
    let creds = {username: 'administrator', password: 'administrator'}

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
            let csd: any = {
                customer_id: testCustomerId,
                speeddials: [
                    {
                        slot: '*1',
                        destination: '4310001'
                    },
                    {
                        slot: '*2',
                        destination: '4310002'
                    },
                ]
            }
            it('create customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .post('/customerspeeddials')
                    .set(...authHeader)
                    .send(csd)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.id)
            })
            it('fail duplicate customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .post('/customerspeeddials')
                    .set(...authHeader)
                    .send(csd)
                expect(response.status).toEqual(422)
            })
            it('validation fail customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .post('/customerspeeddials')
                    .set(...authHeader)
                    .send({ customer_id: testCustomerId })
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read created customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/customerspeeddials/${testCustomerId}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const csd: CustomerSpeedDialResponseDto = response.body
                expect(await validate(csd)).toEqual([])
                expect(csd.id).toEqual(testCustomerId)
                expect(csd.speeddials).toHaveLength(2)
                expect(csd.speeddials[0].slot).toEqual('*1')
                expect(csd.speeddials[0].destination).toMatch(RegExp('^sip:4310001@'))
                expect(csd.speeddials[1].slot).toEqual('*2')
                expect(csd.speeddials[1].destination).toMatch(RegExp('^sip:4310002@'))
            })
            it('read non-existing customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .get('/customerspeeddials/9999111111')
                    .set(...authHeader)
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            const csd = {
                speeddials: [
                    {
                        slot: '*3',
                        destination: '4310003'
                    },
                    {
                        slot: '*4',
                        destination: '4310004'
                    },
                ]
            }
            it('update customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/customerspeeddials/${testCustomerId}`)
                    .set(...authHeader)
                    .send(csd)
                expect(response.status).toEqual(200)
            })
            it('read adjusted customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/customerspeeddials/${testCustomerId}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const csd: CustomerSpeedDialResponseDto = response.body
                expect(await validate(csd)).toEqual([])
                expect(csd.id).toEqual(testCustomerId)
                expect(csd.speeddials).toHaveLength(2)
                expect(csd.speeddials[0].slot).toEqual('*3')
                expect(csd.speeddials[0].destination).toMatch(RegExp('^sip:4310003@'))
                expect(csd.speeddials[1].slot).toEqual('*4')
                expect(csd.speeddials[1].destination).toMatch(RegExp('^sip:4310004@'))
            })
            it('update non-existing customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .put('/customerspeeddials/999911111122')
                    .set(...authHeader)
                    .send(csd)
                expect(response.status).toEqual(404)
            })
        })

        describe('PATCH', () => {
            const patch: PatchOperation = {
                op: "add",
                path: "/speeddials/-",
                value: {
                    slot: '*5',
                    destination: '4310005',
                }
            }
            const invalidPatch: PatchOperation = {
                op: "add",
                path: "/speeddials",
                value: {
                    slot: '*5',
                    destination: '4310005',
                }
            }
            it('adjust customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/customerspeeddials/${testCustomerId}`)
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(200)
            })
            it('read updated customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/customerspeeddials/${testCustomerId}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const csd: CustomerSpeedDialResponseDto = response.body
                expect(await validate(csd)).toEqual([])
                expect(csd.id).toEqual(testCustomerId)
                expect(csd.speeddials).toHaveLength(3)
                expect(csd.speeddials[0].slot).toEqual('*3')
                expect(csd.speeddials[0].destination).toMatch(RegExp('^sip:4310003@'))
                expect(csd.speeddials[1].slot).toEqual('*4')
                expect(csd.speeddials[1].destination).toMatch(RegExp('^sip:4310004@'))
                expect(csd.speeddials[2].slot).toEqual('*5')
                expect(csd.speeddials[2].destination).toMatch(RegExp('^sip:4310005@'))
            })
            it('adjust non-existing customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/customerspeeddials/999991111112')
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(404)
            })
            it('adjust invalid patch customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/customerspeeddials/${testCustomerId}`)
                    .set(...authHeader)
                    .send(invalidPatch)
                expect(response.status).toEqual(422)
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