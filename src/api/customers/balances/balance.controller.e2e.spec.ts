import {ClassSerializerInterceptor, HttpStatus, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {In, MoreThanOrEqual} from 'typeorm'

import {CustomerBalanceModule} from '~/api/customers/balances/balance.module'
import {CustomerBalanceResponseDto} from '~/api/customers/balances/dto/balance-response.dto'
import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

type CustomerBalancePut = {
    cash_balance: number
    cash_debit?: number
    free_time_balance?: number
    free_time_spent?: number
}

const CONTACT_ID = 1
const SIPACCOUNT_PRODUCT_ID = 4

describe('Customer Balances', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    const createdBalanceIds: number[] = []
    const fixtureContractIds: number[] = []
    const creds = {username: 'mockAdminUser', password: 'mockAdminPass'}
    const startedAt = Date.now() / 1000
    let contractId: number
    let oldBalanceId: number
    let balanceId: number

    const createBalance = async (cashBalance: number, start: Date, end: Date): Promise<number> => {
        const balance = await db.billing.ContractBalance.create({
            contract_id: contractId,
            cash_balance: cashBalance,
            cash_balance_interval: 150.5,
            initial_cash_balance: 7,
            initial_free_time_balance: 8,
            free_time_balance: 60,
            free_time_balance_interval: 30,
            topup_count: 2,
            start: start,
            end: end,
        }).save()
        createdBalanceIds.push(balance.id)
        return balance.id
    }

    const putBalance = (id: number, balance: CustomerBalancePut): request.Test =>
        request(app.getHttpServer())
            .put(`/api/customers/balances/${id}`)
            .set(...authHeader)
            .set('Accept', 'application/json')
            .set('Content-Type', 'application/json')
            .set('Prefer', 'return=representation')
            .send(balance)

    const expectKeptColumns = async (id: number): Promise<void> => {
        const row = await db.billing.ContractBalance.findOneByOrFail({id: id})
        expect(row.contract_id).toEqual(contractId)
        expect(row.cash_balance_interval).toEqual(150.5)
        expect(row.free_time_balance_interval).toEqual(30)
        expect(row.initial_cash_balance).toEqual(7)
        expect(row.initial_free_time_balance).toEqual(8)
        expect(row.topup_count).toEqual(2)
        expect(row.start).not.toBeNull()
        expect(row.end).not.toBeNull()
    }

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CustomerBalanceModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

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

        const contract = await db.billing.Contract.create({
            contact_id: CONTACT_ID,
            product_id: SIPACCOUNT_PRODUCT_ID,
            status: ContractStatus.Active,
            create_timestamp: new Date(),
            modify_timestamp: new Date(),
        }).save()
        contractId = contract.id
        fixtureContractIds.push(contract.id)
        oldBalanceId = await createBalance(10, new Date(2026, 0, 1), new Date(2026, 0, 31, 23, 59, 59))
        balanceId = await createBalance(20, new Date(2026, 1, 1), new Date(2026, 1, 28, 23, 59, 59))
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
        describe('GET', () => {
            it('read customer balances', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/customers/balances')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(HttpStatus.OK)
                const {data: balances, total_count: count} = response.body
                expect(balances.length).toBeGreaterThan(0)
                expect(count).toBeGreaterThanOrEqual(balances.length)
            })
            it('read the latest balance of a customer', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/customers/${contractId}/balances`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(HttpStatus.OK)
                const {data: balances, total_count: count} = response.body
                expect(count).toEqual(1)
                expect(balances.map((b: CustomerBalanceResponseDto) => b.id)).toEqual([balanceId])
            })
            it('read customer balance', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/customers/balances/${balanceId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(HttpStatus.OK)
                const balance: CustomerBalanceResponseDto = response.body
                expect(balance.cash_balance).toEqual(20)
                expect(balance.cash_debit).toEqual(150.5)
                expect(balance.free_time_spent).toEqual(30)
            })
            it('read an older customer balance', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/customers/balances/${oldBalanceId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.id).toEqual(oldBalanceId)
            })
            it('read non-existing balance', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/customers/balances/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(HttpStatus.NOT_FOUND)
            })
        })

        describe('PUT', () => {
            it('writes cash_balance and free_time_balance only', async () => {
                const response = await putBalance(balanceId, {
                    cash_balance: 100,
                    cash_debit: 999,
                    free_time_balance: 40,
                    free_time_spent: 999,
                })
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.cash_balance).toEqual(100)
                expect(response.body.free_time_balance).toEqual(40)
                await expectKeptColumns(balanceId)
            })
            it.each([
                ['zero', 0],
                ['negative', -50],
                ['decimal', 12.34],
            ])('accepts a %s cash_balance', async (_name, cashBalance) => {
                const response = await putBalance(balanceId, {cash_balance: cashBalance})
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.cash_balance).toEqual(cashBalance)
            })
            it('keeps free_time_balance when omitted', async () => {
                const response = await putBalance(balanceId, {cash_balance: 1})
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.free_time_balance).toEqual(40)
                await expectKeptColumns(balanceId)
            })
            it('accepts the body of a GET', async () => {
                const get = await request(app.getHttpServer())
                    .get(`/api/customers/balances/${balanceId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                const {cash_balance, cash_debit, free_time_balance, free_time_spent} = get.body
                const response = await putBalance(balanceId, {cash_balance, cash_debit, free_time_balance, free_time_spent})
                expect(response.status).toEqual(HttpStatus.OK)
                await expectKeptColumns(balanceId)
            })
            it('rejects a non-numeric cash_balance', async () => {
                const response = await putBalance(balanceId, {cash_balance: 'x' as unknown as number})
                expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
            })
            it('update non-existing balance', async () => {
                const response = await putBalance(999911111122, {cash_balance: 100})
                expect(response.status).toEqual(HttpStatus.NOT_FOUND)
            })
        })

        describe('PATCH', () => {
            const patch: PatchOperation[] = [
                {
                    op: 'replace',
                    path: '/cash_balance',
                    value: -1.5,
                },
            ]
            it('adjust created balances cash_balance', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/customers/balances/${balanceId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .set('Prefer', 'return=representation')
                    .send(patch)
                expect(response.status).toEqual(HttpStatus.OK)
                expect(response.body.cash_balance).toEqual(-1.5)
                expect(response.body.free_time_balance).toEqual(40)
                await expectKeptColumns(balanceId)
            })
            it('adjust non-existing balance', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/customers/balances/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(HttpStatus.NOT_FOUND)
            })
        })
    })

    describe('Customer Balances DELETE', () => {
        it('delete created balances and fixtures', async () => {
            if (createdBalanceIds.length) {
                // journals take the first path segment as resource_name, the ids are balance ids
                await db.billing.Journal.delete({
                    resource_name: 'customers',
                    resource_id: In(createdBalanceIds),
                    timestamp: MoreThanOrEqual(startedAt),
                })
                await db.billing.ContractBalance.delete(createdBalanceIds)
            }
            if (fixtureContractIds.length)
                await db.billing.Contract.delete(fixtureContractIds)
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})
