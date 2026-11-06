import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {In, MoreThanOrEqual} from 'typeorm'

import {PeeringInboundRuleResponseDto} from './dto/inbound-rule-response.dto'
import {PeeringInboundRuleModule} from './inbound-rule.module'

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

type PeeringInboundRulePost = {
    group_id: number
    field: string
    pattern: string
    reject_code?: number
    reject_reason?: string
    priority: number
    enabled: boolean
}

describe('Peering Inbound Rule', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let contractId: number
    let groupId: number
    let otherGroupId: number
    const createdIds: number[] = []
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const prefix = `e2e_peer_inrule_${process.env.JEST_WORKER_ID}_${Date.now()}`
    const startedAt = Date.now() / 1000

    const rulePost = (n: number): PeeringInboundRulePost => ({
        group_id: groupId,
        field: 'from_user',
        pattern: `^${prefix}_${n}`,
        reject_code: 400 + n,
        reject_reason: `${prefix}_${n}`,
        priority: 10 * n,
        enabled: true,
    })

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [PeeringInboundRuleModule, AppModule],
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
        const otherGroup = await db.provisioning.VoipPeeringGroup.insert({
            name: `${prefix}_other`,
            priority: 1,
            peering_contract_id: contractId,
            has_inbound_rules: 0,
        })
        otherGroupId = otherGroup.identifiers[0].id
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
            it('create inbound rules', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/peerings/groups/inbound-rules')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send([rulePost(1), rulePost(2)])
                expect(response.status).toEqual(201)
                const rules: PeeringInboundRuleResponseDto[] = response.body.data
                expect(rules).toHaveLength(2)
                createdIds.push(...rules.map(r => +r.id))
                expect(rules[0].group_id).toEqual(groupId)
                expect(rules[0].field).toEqual('from_user')
                expect(rules[0].pattern).toEqual(`^${prefix}_1`)
                expect(rules[0].reject_code).toEqual(401)
                expect(rules[0].priority).toEqual(10)
                expect(rules[0].enabled).toBe(true)
            })
            it('set has_inbound_rules on the group', async () => {
                const group = await db.provisioning.VoipPeeringGroup.findOneByOrFail({id: groupId})
                expect(group.has_inbound_rules).toEqual(1)
            })
            it('fail to create inbound rule with invalid field', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/peerings/groups/inbound-rules')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...rulePost(3), field: 'invalid_field'})
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read inbound rules of the group', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/peerings/groups/inbound-rules?group_id=${groupId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(2)
                const rules: PeeringInboundRuleResponseDto[] = response.body.data
                expect(rules.map(r => r.id).sort()).toEqual([...createdIds].sort())
            })
            it('read inbound rules by group path', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/peerings/groups/${groupId}/inbound-rules`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(2)
                const rules: PeeringInboundRuleResponseDto[] = response.body.data
                expect(rules.every(r => r.group_id == groupId)).toBe(true)
            })
            it('read inbound rule', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/peerings/groups/inbound-rules/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const rule: PeeringInboundRuleResponseDto = response.body
                expect(rule.id).toEqual(createdIds[0])
                expect(rule.pattern).toEqual(`^${prefix}_1`)
                expect(rule.reject_reason).toEqual(`${prefix}_1`)
            })
            it('read non-existing inbound rule', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/peerings/groups/inbound-rules/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            it('update inbound rule', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/peerings/groups/inbound-rules/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...rulePost(1), field: 'to_user', pattern: `^${prefix}_1_put`, priority: 15})
                expect(response.status).toEqual(204)
                const rule = await db.provisioning.VoipPeeringInboundRule.findOneByOrFail({id: createdIds[0]})
                expect(rule.field).toEqual('to_user')
                expect(rule.pattern).toEqual(`^${prefix}_1_put`)
                expect(rule.priority).toEqual(15)
                expect(rule.group_id).toEqual(groupId)
            })
            it('update inbound rules bulk', async () => {
                const response = await request(app.getHttpServer())
                    .put('/api/peerings/groups/inbound-rules')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        [createdIds[0]]: {...rulePost(1), pattern: `^${prefix}_1_bulk`},
                        [createdIds[1]]: {...rulePost(2), pattern: `^${prefix}_2_bulk`, enabled: false},
                    })
                expect(response.status).toEqual(204)
                const rules = await db.provisioning.VoipPeeringInboundRule.findBy({id: In(createdIds)})
                expect(rules.find(r => r.id == createdIds[0]).pattern).toEqual(`^${prefix}_1_bulk`)
                expect(rules.find(r => r.id == createdIds[0]).field).toEqual('from_user')
                expect(rules.find(r => r.id == createdIds[1]).pattern).toEqual(`^${prefix}_2_bulk`)
                expect(rules.find(r => r.id == createdIds[1]).enabled).toBe(false)
            })
        })

        describe('PATCH', () => {
            it('adjust inbound rule', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/peerings/groups/inbound-rules/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/pattern', value: `^${prefix}_1_patch`}])
                expect(response.status).toEqual(204)
                const rule = await db.provisioning.VoipPeeringInboundRule.findOneByOrFail({id: createdIds[0]})
                expect(rule.pattern).toEqual(`^${prefix}_1_patch`)
                expect(rule.field).toEqual('from_user')
                expect(rule.group_id).toEqual(groupId)
            })
            it('adjust inbound rules bulk', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/peerings/groups/inbound-rules')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send({
                        [createdIds[0]]: [{op: 'replace', path: '/priority', value: 77}],
                        [createdIds[1]]: [{op: 'replace', path: '/enabled', value: true}],
                    })
                expect(response.status).toEqual(204)
                const rules = await db.provisioning.VoipPeeringInboundRule.findBy({id: In(createdIds)})
                expect(rules.find(r => r.id == createdIds[0]).priority).toEqual(77)
                expect(rules.find(r => r.id == createdIds[0]).pattern).toEqual(`^${prefix}_1_patch`)
                expect(rules.find(r => r.id == createdIds[1]).enabled).toBe(true)
                expect(rules.find(r => r.id == createdIds[1]).pattern).toEqual(`^${prefix}_2_bulk`)
            })
        })

        describe('move between groups', () => {
            const hasInboundRules = async (id: number): Promise<number> =>
                (await db.provisioning.VoipPeeringGroup.findOneByOrFail({id})).has_inbound_rules

            it('set has_inbound_rules on the new group with update', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/peerings/groups/inbound-rules/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...rulePost(1), group_id: otherGroupId})
                expect(response.status).toEqual(204)
                expect(await hasInboundRules(otherGroupId)).toEqual(1)
                expect(await hasInboundRules(groupId)).toEqual(1)
            })
            it('clear has_inbound_rules on the old group with adjust', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/peerings/groups/inbound-rules/${createdIds[1]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/group_id', value: otherGroupId}])
                expect(response.status).toEqual(204)
                expect(await hasInboundRules(groupId)).toEqual(0)
                expect(await hasInboundRules(otherGroupId)).toEqual(1)
            })
            it('update has_inbound_rules of both groups with bulk adjust', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/peerings/groups/inbound-rules')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send({
                        [createdIds[0]]: [{op: 'replace', path: '/group_id', value: groupId}],
                        [createdIds[1]]: [{op: 'replace', path: '/group_id', value: groupId}],
                    })
                expect(response.status).toEqual(204)
                expect(await hasInboundRules(groupId)).toEqual(1)
                expect(await hasInboundRules(otherGroupId)).toEqual(0)
            })
        })
    })

    describe('Peering Inbound Rules DELETE', () => {
        it('delete created inbound rules', async () => {
            for (const id of createdIds) {
                const response = await request(app.getHttpServer())
                    .delete(`/api/peerings/groups/inbound-rules/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                expect(response.status).toEqual(204)
            }
            expect(await db.provisioning.VoipPeeringInboundRule.countBy({group_id: groupId})).toEqual(0)
        })
        it('clear has_inbound_rules on the group after the last rule is deleted', async () => {
            const group = await db.provisioning.VoipPeeringGroup.findOneByOrFail({id: groupId})
            expect(group.has_inbound_rules).toEqual(0)
        })
        it('delete created group and contract', async () => {
            await db.provisioning.VoipPeeringInboundRule.delete({group_id: In([groupId, otherGroupId])})
            await db.provisioning.VoipPeeringGroup.delete([groupId, otherGroupId])
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
