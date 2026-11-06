import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {In, MoreThanOrEqual} from 'typeorm'

import {PeeringRuleResponseDto} from './dto/rule-response.dto'
import {PeeringRuleModule} from './rule.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

type PeeringRulePost = {
    group_id: number
    callee_prefix?: string
    callee_pattern?: string
    caller_pattern?: string
    description: string
    enabled: boolean
    stopper: boolean
}

describe('Peering Rule', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let contractId: number
    let groupId: number
    const createdIds: number[] = []
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const prefix = `e2e_peer_rule_${process.env.JEST_WORKER_ID}_${Date.now()}`
    const startedAt = Date.now() / 1000

    const rulePost = (n: number): PeeringRulePost => ({
        group_id: groupId,
        callee_prefix: `43${n}`,
        callee_pattern: `^43${n}`,
        caller_pattern: `^49${n}`,
        description: `${prefix}_${n}`,
        enabled: true,
        stopper: false,
    })

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [PeeringRuleModule, AppModule],
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
            contact_id: 2,
            product_id: 2,
            create_timestamp: new Date(),
            modify_timestamp: new Date(),
        }).save()
        contractId = contract.id
        const group = await db.provisioning.VoipPeeringGroup.insert({
            name: prefix,
            priority: 1,
            peering_contract_id: contractId,
            has_inbound_rules: 0,
        })
        groupId = group.identifiers[0].id
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
            it('create rules', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/peerings/groups/rules')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send([rulePost(1), rulePost(2)])
                expect(response.status).toEqual(201)
                const rules: PeeringRuleResponseDto[] = response.body.data
                expect(rules).toHaveLength(2)
                createdIds.push(...rules.map(r => +r.id))
                expect(rules[0].group_id).toEqual(groupId)
                expect(rules[0].callee_prefix).toEqual('431')
                expect(rules[0].description).toEqual(`${prefix}_1`)
                expect(rules[0].enabled).toBe(true)
                expect(rules[0].stopper).toBe(false)
            })
            it('fail to create rule without description', async () => {
                const {description: _description, ...rule} = rulePost(3)
                const response = await request(app.getHttpServer())
                    .post('/api/peerings/groups/rules')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(rule)
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read rules of the group', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/peerings/groups/rules?group_id=${groupId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(2)
                const rules: PeeringRuleResponseDto[] = response.body.data
                expect(rules.map(r => r.id).sort()).toEqual([...createdIds].sort())
            })
            it('read rules by group path', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/peerings/groups/${groupId}/rules`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(2)
                const rules: PeeringRuleResponseDto[] = response.body.data
                expect(rules.every(r => r.group_id == groupId)).toBe(true)
            })
            it('read rule', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/peerings/groups/rules/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const rule: PeeringRuleResponseDto = response.body
                expect(rule.id).toEqual(createdIds[0])
                expect(rule.callee_pattern).toEqual('^431')
                expect(rule.caller_pattern).toEqual('^491')
            })
            it('read non-existing rule', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/peerings/groups/rules/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            it('update rule', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/peerings/groups/rules/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...rulePost(1), callee_prefix: '4311', description: `${prefix}_1_put`, stopper: true})
                expect(response.status).toEqual(204)
                const rule = await db.provisioning.VoipPeeringRule.findOneByOrFail({id: createdIds[0]})
                expect(rule.callee_prefix).toEqual('4311')
                expect(rule.description).toEqual(`${prefix}_1_put`)
                expect(rule.stopper).toBe(true)
                expect(rule.group_id).toEqual(groupId)
            })
            it('update rules bulk', async () => {
                const response = await request(app.getHttpServer())
                    .put('/api/peerings/groups/rules')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        [createdIds[0]]: {...rulePost(1), description: `${prefix}_1_bulk`},
                        [createdIds[1]]: {...rulePost(2), description: `${prefix}_2_bulk`, enabled: false},
                    })
                expect(response.status).toEqual(204)
                const rules = await db.provisioning.VoipPeeringRule.findBy({id: In(createdIds)})
                expect(rules.find(r => r.id == createdIds[0]).description).toEqual(`${prefix}_1_bulk`)
                expect(rules.find(r => r.id == createdIds[0]).stopper).toBe(false)
                expect(rules.find(r => r.id == createdIds[1]).description).toEqual(`${prefix}_2_bulk`)
                expect(rules.find(r => r.id == createdIds[1]).enabled).toBe(false)
            })
        })

        describe('PATCH', () => {
            it('adjust rule', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/peerings/groups/rules/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/description', value: `${prefix}_1_patch`}])
                expect(response.status).toEqual(204)
                const rule = await db.provisioning.VoipPeeringRule.findOneByOrFail({id: createdIds[0]})
                expect(rule.description).toEqual(`${prefix}_1_patch`)
                expect(rule.callee_prefix).toEqual('431')
                expect(rule.group_id).toEqual(groupId)
            })
            it('adjust rules bulk', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/peerings/groups/rules')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send({
                        [createdIds[0]]: [{op: 'replace', path: '/stopper', value: true}],
                        [createdIds[1]]: [{op: 'replace', path: '/enabled', value: true}],
                    })
                expect(response.status).toEqual(204)
                const rules = await db.provisioning.VoipPeeringRule.findBy({id: In(createdIds)})
                expect(rules.find(r => r.id == createdIds[0]).stopper).toBe(true)
                expect(rules.find(r => r.id == createdIds[0]).description).toEqual(`${prefix}_1_patch`)
                expect(rules.find(r => r.id == createdIds[1]).enabled).toBe(true)
                expect(rules.find(r => r.id == createdIds[1]).description).toEqual(`${prefix}_2_bulk`)
            })
        })
    })

    describe('Peering Rules DELETE', () => {
        it('delete created rules', async () => {
            for (const id of createdIds) {
                const response = await request(app.getHttpServer())
                    .delete(`/api/peerings/groups/rules/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                expect(response.status).toEqual(204)
            }
            expect(await db.provisioning.VoipPeeringRule.countBy({group_id: groupId})).toEqual(0)
        })
        it('delete created group and contract', async () => {
            await db.provisioning.VoipPeeringRule.delete({group_id: groupId})
            await db.provisioning.VoipPeeringGroup.delete(groupId)
            await db.billing.Contract.delete(contractId)
        })
        it('delete created journals', async () => {
            await db.billing.Journal.delete({username: creds.username, timestamp: MoreThanOrEqual(startedAt)})
        })
        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})
