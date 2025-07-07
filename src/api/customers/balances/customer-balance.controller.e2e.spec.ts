import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'

import {CustomerBalanceModule} from '~/api/customers/balances/customer-balance.module'
import {CustomerBalanceResponseDto} from '~/api/customers/balances/dto/customer-balance-response.dto'
import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {db} from '~/entities'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {ResponseValidationInterceptor} from '~/interceptors/validate.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

type CustomerBalancePut = {
    cash_balance: number
    cash_debit: number
    free_time_balance: number
    free_time_spent: number
}

describe('Customer Balances', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let createdBalanceIds: number[] = []
    const creds = {username: 'administrator', password: 'administrator'}

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CustomerBalanceModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        const balance = await db.billing.ContractBalance.create({
            contract_id: 1,
            cash_balance: 0,
            cash_balance_interval: 0,
            initial_cash_balance: 0,
            initial_free_time_balance: 0,
            free_time_balance: 0,
            free_time_balance_interval: 0,
        }).save()
        createdBalanceIds = [balance.id]

        app = moduleRef.createNestApplication()

        // TODO import other app configuration from bootstrap()
        // like interceptors, etc.
        app.useGlobalPipes(new ValidateInputPipe())
        app.useGlobalFilters(new HttpExceptionFilter())
        app.useGlobalInterceptors(new ResponseValidationInterceptor())

        await app.init()
    })

    afterAll(async () => {
        if (appService.db.isInitialized) {
            await db.billing.ContractBalance.delete(createdBalanceIds)
            await appService.db.destroy()
        }
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
        describe('GET', () => {
            it('read customer balances', async () => {
                const response = await request(app.getHttpServer())
                    .get('/customers/balances')
                    .set(...authHeader)
                expect(response.status).toEqual(200)
            })
            it('read customer balance', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/customers/balances/${createdBalanceIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
            })
            it('read non-existing balance', async () => {
                const response = await request(app.getHttpServer())
                    .get('/customers/balances/999911111122')
                    .set(...authHeader)
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            it('update balance > cash_balance', async () => {
                const balance: CustomerBalancePut = {
                    cash_balance: 100,
                    cash_debit: 0,
                    free_time_balance: 0,
                    free_time_spent: 0,
                }
                const response = await request(app.getHttpServer())
                    .put(`/customers/balances/${createdBalanceIds[0]}`)
                    .set(...authHeader)
                    .send(balance)
                expect(response.status).toEqual(200)
            })
            it('read updated balance', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/customers/balances/${createdBalanceIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const balance: CustomerBalanceResponseDto = response.body
                expect(balance.cash_balance).toEqual(100)
            })
            it('update non-existing balance', async () => {
                const balance: CustomerBalancePut = {
                    cash_balance: 100,
                    cash_debit: 0,
                    free_time_balance: 0,
                    free_time_spent: 0,
                }
                const response = await request(app.getHttpServer())
                    .put('/customers/balances/999911111122')
                    .set(...authHeader)
                    .send (balance)
                expect(response.status).toEqual(404)
            })
        })

        describe('PATCH', () => {
            const patch: PatchOperation[] = [
                {
                    op: 'replace',
                    path: '/cash_balance',
                    value: 1,
                },
            ]
            it('adjust created balances cash_balance', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/customers/balances/${createdBalanceIds[0]}`)
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(200)
            })
            it('adjust non-existing balance', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/customers/balances/999911111122')
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })
    })
})
