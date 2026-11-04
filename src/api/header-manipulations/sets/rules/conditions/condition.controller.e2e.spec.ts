import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {In, MoreThanOrEqual} from 'typeorm'

import {HeaderManipulationRuleConditionModule} from './condition.module'
import {HeaderManipulationRuleConditionResponseDto} from './dto/condition-response.dto'

import {HeaderManipulationRuleModule} from '~/api/header-manipulations/sets/rules/rule.module'
import {HeaderManipulationSetModule} from '~/api/header-manipulations/sets/set.module'
import {RewriteRuleSetResponseDto} from '~/api/rewrite-rules/sets/dto/set-response.dto'
import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {RwrDpEnum} from '~/enums/rwr-dp.enum'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

type RuleSetPost = {
    name: string
    reseller_id: number
    description: string
}

type RulePost = {
    set_id: number
    name: string
    description: string
    priority: number
    direction: string
    stopper: boolean
    enabled: boolean
}

type RuleConditionPost = {
    rule_id: number
    match_type: string
    match_part: string
    match_name: string
    expression: string
    expression_negation: boolean
    value_type: string
    enabled: boolean
    values?: string[]
    rwr_set_id?: number
    rwr_dp?: RwrDpEnum
}

type RuleConditionWithExpand = RuleConditionPost & {rwr_set_id_expand: RewriteRuleSetResponseDto}

describe('Rule Condition', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let createdRwrSetIds: number[] = []
    let createdSetIds: number[] = []
    let createdRuleIds: number[] = []
    let createdConditionIds: number[] = []
    const creds = {username: 'mockAdminUser', password: 'mockAdminPass'}
    const startedAt = Date.now() / 1000

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [HeaderManipulationRuleConditionModule, HeaderManipulationSetModule,HeaderManipulationRuleModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        createdRwrSetIds = []
        createdSetIds = []
        createdRuleIds = []
        createdConditionIds = []

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
            const rwrSetPost = {
                name: 'foo_rwr_set_1',
                reseller_id: 1,
                description: 'foo_rwr_set_1 description',
            }
            it('create rwr set foo_rwr_set_1', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/rewrite-rules/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(rwrSetPost)
                expect(response.status).toEqual(201)
                createdRwrSetIds.push(+response.body.data[0].id)
            })

            const ruleset1: RuleSetPost = {
                name: 'test_ruleset1',
                reseller_id: 1,
                description: 'test_ruleset1 description',
            }
            it('create set test_ruleset1', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/header-manipulations/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ruleset1)
                expect(response.status).toEqual(201)
                createdSetIds.push(+response.body.data[0].id)
            })

            it('create rule 1', async () => {
                const rule1: RulePost = {
                    set_id: createdSetIds[0],
                    name: 'test_rule1',
                    description: 'test_rule1 description',
                    priority: 100,
                    direction: 'a_inbound',
                    stopper: false,
                    enabled: true,
                }
                const response = await request(app.getHttpServer())
                    .post('/api/header-manipulations/sets/rules')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(rule1)
                expect(response.status).toEqual(201)
                createdRuleIds.push(+response.body.data[0].id)
            })

            it ('fails to create condition if only one of rwr_set_id or rwr_dp is provided', async () => {
                const condition1: RuleConditionPost = {
                    rule_id: createdRuleIds[0],
                    match_type: 'header',
                    match_part: 'full',
                    match_name: 'Asd',
                    expression: 'is',
                    expression_negation: false,
                    value_type: 'input',
                    enabled: true,
                    rwr_set_id: createdRwrSetIds[0],
                }
                const response = await request(app.getHttpServer())
                    .post('/api/header-manipulations/sets/rules/conditions')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(condition1)
                expect(response.status).toEqual(422)
            })

            it ('create condition 1', async () => {
                const condition1: RuleConditionPost = {
                    rule_id: createdRuleIds[0],
                    match_type: 'header',
                    match_part: 'full',
                    match_name: 'Asd',
                    expression: 'is',
                    expression_negation: false,
                    value_type: 'input',
                    enabled: true,
                    values: ['foo', 'bar', 'baz'],
                    rwr_dp: RwrDpEnum.callee_in,
                    rwr_set_id: createdRwrSetIds[0],
                }
                const response = await request(app.getHttpServer())
                    .post('/api/header-manipulations/sets/rules/conditions')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(condition1)
                expect(response.status).toEqual(201)
                createdConditionIds.push(+response.body.data[0].id)
            })

            it ('create condition 2', async () => {
                const condition2: RuleConditionPost = {
                    rule_id: createdRuleIds[0],
                    match_type: 'header',
                    match_part: 'full',
                    match_name: 'Asd',
                    expression: 'is',
                    expression_negation: false,
                    value_type: 'input',
                    enabled: true,
                }
                const response = await request(app.getHttpServer())
                    .post('/api/header-manipulations/sets/rules/conditions')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(condition2)
                expect(response.status).toEqual(201)
                createdConditionIds.push(+response.body.data[0].id)
            })
        })

        describe('GET', () => {
            it('read created rule condition', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/header-manipulations/sets/rules/conditions/${createdConditionIds[0]}?expand=rwr_set_id`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const condition: HeaderManipulationRuleConditionResponseDto = response.body
                expect(condition.rule_id).toEqual(createdRuleIds[0])
                expect((condition as unknown as RuleConditionWithExpand).rwr_set_id_expand).toBeDefined()
            })
            it('read created rule condition1 values', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/header-manipulations/sets/rules/conditions/${createdConditionIds[0]}/@values`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const conditions = response.body
                expect(conditions.data.length).toEqual(3)
                expect(conditions.data[0].value).toEqual('foo')
            })
            it('read non-existing condition', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/header-manipulations/sets/rules/conditions/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            it('update condition 1 match_name', async () => {
                const condition1: RuleConditionPost = {
                    rule_id: createdRuleIds[0],
                    match_type: 'header',
                    match_part: 'full',
                    match_name: 'Foo',
                    expression: 'is',
                    expression_negation: false,
                    value_type: 'input',
                    enabled: true,
                    values: ['foo', 'bar', 'baz'],
                }
                const response = await request(app.getHttpServer())
                    .put(`/api/header-manipulations/sets/rules/conditions/${createdConditionIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(condition1)
                expect(response.status).toEqual(204)
            })

            it('read updated condition 1', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/header-manipulations/sets/rules/conditions/${createdConditionIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const condition: HeaderManipulationRuleConditionResponseDto = response.body
                expect(condition.match_name).toEqual('Foo')
            })

            it('update non-existing condition', async () => {
                const condition: RuleConditionPost = {
                    rule_id: createdRuleIds[0],
                    match_type: 'header',
                    match_part: 'full',
                    match_name: 'Foo',
                    expression: 'is',
                    expression_negation: false,
                    value_type: 'input',
                    enabled: true,
                    values: ['foo', 'bar', 'baz'],
                }
                const response = await request(app.getHttpServer())
                    .put('/api/header-manipulations/sets/rules/conditions/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(condition)
                expect(response.status).toEqual(404)
            })

            it('update condition 1 values', async () => {
                const condition1: RuleConditionPost = {
                    rule_id: createdRuleIds[0],
                    match_type: 'header',
                    match_part: 'full',
                    match_name: 'Foo',
                    expression: 'is',
                    expression_negation: false,
                    value_type: 'input',
                    enabled: true,
                    values: ['foo', 'bar', 'baz', 'qux'],
                }
                const response = await request(app.getHttpServer())
                    .put(`/api/header-manipulations/sets/rules/conditions/${createdConditionIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(condition1)
                expect(response.status).toEqual(204)
            })

            it('read updated condition 1 values', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/header-manipulations/sets/rules/conditions/${createdConditionIds[0]}/@values`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const conditions = response.body
                expect(conditions.data.length).toEqual(4)
            })
        })

        describe('PATCH', () => {
            const patch: PatchOperation[] = [
                {
                    op: 'replace',
                    path: '/values',
                    value: [],
                },
            ]

            it('adjust condition values', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/header-manipulations/sets/rules/conditions/${createdConditionIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(204)
            })

            it('read updated condition 1 values', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/header-manipulations/sets/rules/conditions/${createdConditionIds[0]}/@values`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const conditions = response.body
                expect(conditions.data.length).toEqual(0)
            })

            it('adjust non-existing condition', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/header-manipulations/sets/rules/conditions/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('Rule condition DELETE', () => {
        it('delete created conditions', async () => {
            for (const id of createdConditionIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/api/header-manipulations/sets/rules/conditions/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(result.status).toEqual(204)
            }
        })
        it('delete created rules', async () => {
            for (const id of createdRuleIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/api/header-manipulations/sets/rules/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(result.status).toEqual(204)
            }
        })
        it('delete created sets', async () => {
            for (const id of createdSetIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/api/header-manipulations/sets/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(result.status).toEqual(204)
            }
        })
        it('delete created rwr sets', async () => {
            for (const id of createdRwrSetIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/api/rewrite-rules/sets/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(result.status).toEqual(204)
            }
        })
        it('delete created journals', async () => {
            const headerManipulationsIds = [...createdSetIds, ...createdRuleIds, ...createdConditionIds]
            if (headerManipulationsIds.length)
                await db.billing.Journal.delete({
                    resource_name: 'header-manipulations',
                    resource_id: In(headerManipulationsIds),
                    timestamp: MoreThanOrEqual(startedAt),
                })
            if (createdRwrSetIds.length)
                await db.billing.Journal.delete({
                    resource_name: 'rewrite-rules',
                    resource_id: In(createdRwrSetIds),
                    timestamp: MoreThanOrEqual(startedAt),
                })
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})
