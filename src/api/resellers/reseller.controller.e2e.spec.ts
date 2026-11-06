import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {In, IsNull} from 'typeorm'

import {ResellerResponseDto} from './dto/reseller-response.dto'
import {ResellerModule} from './reseller.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {validate} from '~/helpers/validate.helper'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

// seed rows: system contact (no reseller) and the product of class 'reseller'
const SYSTEM_CONTACT_ID = 2
const RESELLER_PRODUCT_ID = 3

type ResellerPost = {
    contract_id: number
    name: string
    status: ResellerStatus
}

describe('Reseller', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    const createdIds: number[] = []
    const bulkIds: number[] = []
    const contractIds: number[] = []
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const prefix = `test_reseller_${process.env.JEST_WORKER_ID}_${Date.now()}`

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [ResellerModule, AppModule],
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

        // a reseller needs its own contract with a system contact
        for (let i = 0; i < 5; i++) {
            const contract = await db.billing.Contract.create({
                contact_id: SYSTEM_CONTACT_ID,
                product_id: RESELLER_PRODUCT_ID,
                status: ContractStatus.Active,
                create_timestamp: new Date(),
                modify_timestamp: new Date(),
            }).save()
            contractIds.push(contract.id)
        }
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
            .set('Accept', 'application/json')
            .set('Content-Type', 'application/json')
            .send(creds)
        expect(response.status).toEqual(201)
        expect(response.body['access_token']).toBeDefined()
        authHeader = ['Authorization', 'Bearer ' + response.body['access_token']]
    })

    describe('', () => { // main tests block
        describe('POST', () => {
            it('create resellers', async () => {
                const resellers: ResellerPost[] = [
                    {contract_id: contractIds[0], name: `${prefix}_1`, status: ResellerStatus.Active},
                    {contract_id: contractIds[1], name: `${prefix}_2`, status: ResellerStatus.Locked},
                ]
                for (const reseller of resellers) {
                    const response = await request(app.getHttpServer())
                        .post('/api/resellers')
                        .set(...authHeader)
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .set('Prefer', 'return=representation')
                        .send(reseller)
                    expect(response.status).toEqual(201)
                    createdIds.push(+response.body.data[0].id)
                    const created: ResellerResponseDto = response.body.data[0]
                    expect(created.name).toEqual(reseller.name)
                    expect(created.contract_id).toEqual(reseller.contract_id)
                    expect(created.status).toEqual(reseller.status)
                }
                const defaults = await db.billing.EmailTemplate.countBy({reseller_id: IsNull()})
                expect(await db.billing.EmailTemplate.countBy({reseller_id: createdIds[0]})).toEqual(defaults)
            })
            it('create resellers bulk with their email templates', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/resellers')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send([
                        {contract_id: contractIds[3], name: `bulk_${prefix}_1`, status: ResellerStatus.Active},
                        {contract_id: contractIds[4], name: `bulk_${prefix}_2`, status: ResellerStatus.Active},
                    ])
                expect(response.status).toEqual(201)
                expect(response.body.data).toHaveLength(2)
                for (const reseller of response.body.data)
                    bulkIds.push(+reseller.id)
                const defaults = await db.billing.EmailTemplate.countBy({reseller_id: IsNull()})
                for (const id of bulkIds)
                    expect(await db.billing.EmailTemplate.countBy({reseller_id: id})).toEqual(defaults)
            })
            it('fail create reseller with a contract that already has a reseller', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/resellers')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({contract_id: contractIds[0], name: `${prefix}_dup`, status: ResellerStatus.Active})
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read resellers collection', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/resellers?name=${prefix}_*&order_by=id`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(2)
                expect(response.body.data.map((r: ResellerResponseDto) => r.id)).toEqual(createdIds)
            })
            it('read reseller', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/resellers/${createdIds[1]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const reseller: ResellerResponseDto = response.body
                expect(await validate(reseller)).toEqual([])
                expect(reseller.name).toEqual(`${prefix}_2`)
                expect(reseller.contract_id).toEqual(contractIds[1])
                expect(reseller.status).toEqual(ResellerStatus.Locked)
            })
            it('read non-existing reseller', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/resellers/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            it('update reseller', async () => {
                const update: ResellerPost = {
                    contract_id: contractIds[2],
                    name: `${prefix}_1_put`,
                    status: ResellerStatus.Locked,
                }
                const response = await request(app.getHttpServer())
                    .put(`/api/resellers/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send(update)
                expect(response.status).toEqual(200)
                const reseller: ResellerResponseDto = response.body
                expect(reseller.id).toEqual(createdIds[0])
                expect(reseller.contract_id).toEqual(contractIds[2])
                expect(reseller.name).toEqual(`${prefix}_1_put`)
                expect(reseller.status).toEqual(ResellerStatus.Locked)
            })
            it('update resellers bulk', async () => {
                const response = await request(app.getHttpServer())
                    .put('/api/resellers')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        [createdIds[0]]: {contract_id: contractIds[0], name: `${prefix}_1_bulk`, status: ResellerStatus.Active},
                        [createdIds[1]]: {contract_id: contractIds[1], name: `${prefix}_2_bulk`, status: ResellerStatus.Active},
                    })
                expect(response.status).toEqual(204)
                const reseller = await db.billing.Reseller.findOneByOrFail({id: createdIds[0]})
                expect(reseller.contract_id).toEqual(contractIds[0])
                expect(reseller.name).toEqual(`${prefix}_1_bulk`)
                expect(reseller.status).toEqual(ResellerStatus.Active)
                expect((await db.billing.Reseller.findOneByOrFail({id: createdIds[1]})).name).toEqual(`${prefix}_2_bulk`)
            })
            it('update non-existing reseller', async () => {
                const response = await request(app.getHttpServer())
                    .put('/api/resellers/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({contract_id: contractIds[2], name: `${prefix}_none`, status: ResellerStatus.Active})
                expect(response.status).toEqual(404)
            })
        })

        describe('PATCH', () => {
            it('adjust reseller', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/resellers/${createdIds[1]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .set('Prefer', 'return=representation')
                    .send([{op: 'replace', path: '/name', value: `${prefix}_2_patch`}])
                expect(response.status).toEqual(200)
                const reseller: ResellerResponseDto = response.body
                expect(reseller.name).toEqual(`${prefix}_2_patch`)
                expect(reseller.contract_id).toEqual(contractIds[1])
                expect(reseller.status).toEqual(ResellerStatus.Active)
            })
            it('adjust resellers bulk', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/resellers')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send({
                        [createdIds[0]]: [{op: 'replace', path: '/status', value: ResellerStatus.Locked}],
                        [createdIds[1]]: [{op: 'replace', path: '/status', value: ResellerStatus.Locked}],
                    })
                expect(response.status).toEqual(204)
                const resellers = await db.billing.Reseller.findBy({id: In(createdIds)})
                expect(resellers.map(r => r.status)).toEqual([ResellerStatus.Locked, ResellerStatus.Locked])
                expect(resellers.find(r => r.id == createdIds[1]).name).toEqual(`${prefix}_2_patch`)
            })
        })
    })

    describe('Reseller DELETE', () => {
        it('delete created journals', async () => {
            const ids = [...createdIds, ...bulkIds]
            if (ids.length)
                await db.billing.Journal.delete({resource_name: 'resellers', resource_id: In(ids)})
        })
        it('delete created resellers and contracts', async () => {
            // the email templates of the resellers are deleted with them
            const ids = [...createdIds, ...bulkIds]
            if (ids.length)
                await db.billing.Reseller.delete(ids)
            if (contractIds.length)
                await db.billing.Contract.delete(contractIds)
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})
