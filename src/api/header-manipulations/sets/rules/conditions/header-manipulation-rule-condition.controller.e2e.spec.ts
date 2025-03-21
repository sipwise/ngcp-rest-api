import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'

import {HeaderManipulationRuleConditionResponseDto} from './dto/header-manipulation-rule-condition-response.dto'
import {HeaderManipulationRuleConditionModule} from './header-manipulation-rule-condition.module'

import {HeaderManipulationSetModule} from '~/api/header-manipulations/sets/header-manipulation-set.module'
import {HeaderManipulationRuleModule} from '~/api/header-manipulations/sets/rules/header-manipulation-rule.module'
import {RewriteRuleSetResponseDto} from '~/api/rewrite-rules/sets/dto/rewrite-rule-set-response.dto'
import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RwrDpEnum} from '~/enums/rwr-dp.enum'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {ResponseValidationInterceptor} from '~/interceptors/validate.interceptor'
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
    const creds = {username: 'administrator', password: 'administrator'}

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
            const rwrSetPost = {
                name: 'foo_rwr_set_1',
                reseller_id: 1,
                description: 'foo_rwr_set_1 description',
            }
            it('create rwr set foo_rwr_set_1', async () => {
                const response = await request(app.getHttpServer())
                    .post('/rewrite-rules/sets')
                    .set(...authHeader)
                    .send(rwrSetPost)
                expect(response.status).toEqual(201)
                createdRwrSetIds.push(+response.body[0].id)
            })

            const ruleset1: RuleSetPost = {
                name: 'test_ruleset1',
                reseller_id: 1,
                description: 'test_ruleset1 description',
            }
            it('create set test_ruleset1', async () => {
                const response = await request(app.getHttpServer())
                    .post('/header-manipulations/sets')
                    .set(...authHeader)
                    .send(ruleset1)
                expect(response.status).toEqual(201)
                createdSetIds.push(+response.body[0].id)
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
                    .post('/header-manipulations/sets/rules')
                    .set(...authHeader)
                    .send(rule1)
                expect(response.status).toEqual(201)
                createdRuleIds.push(+response.body[0].id)
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
                    .post('/header-manipulations/sets/rules/conditions')
                    .set(...authHeader)
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
                    .post('/header-manipulations/sets/rules/conditions')
                    .set(...authHeader)
                    .send(condition1)
                expect(response.status).toEqual(201)
                createdConditionIds.push(+response.body[0].id)
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
                    .post('/header-manipulations/sets/rules/conditions')
                    .set(...authHeader)
                    .send(condition2)
                expect(response.status).toEqual(201)
                createdConditionIds.push(+response.body[0].id)
            })
        })

        describe('GET', () => {
            it('read created rule condition', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/header-manipulations/sets/rules/conditions/${createdConditionIds[0]}?expand=rwr_set_id`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const condition: HeaderManipulationRuleConditionResponseDto = response.body
                expect(condition.rule_id).toEqual(createdRuleIds[0])
                expect((condition as unknown as RuleConditionWithExpand).rwr_set_id_expand).toBeDefined()
            })
            it('read created rule condition1 values', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/header-manipulations/sets/rules/conditions/${createdConditionIds[0]}/@values`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const conditions = response.body
                expect(conditions[0].length).toEqual(3)
                expect(conditions[0][0].value).toEqual('foo')
            })
            it('read non-existing condition', async () => {
                const response = await request(app.getHttpServer())
                    .get('/header-manipulations/sets/rules/conditions/999911111122')
                    .set(...authHeader)
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
                    .put(`/header-manipulations/sets/rules/conditions/${createdConditionIds[0]}`)
                    .set(...authHeader)
                    .send(condition1)
                expect(response.status).toEqual(200)
            })

            it('read updated condition 1', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/header-manipulations/sets/rules/conditions/${createdConditionIds[0]}`)
                    .set(...authHeader)
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
                    .put('/header-manipulations/sets/rules/conditions/999911111122')
                    .set(...authHeader)
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
                    .put(`/header-manipulations/sets/rules/conditions/${createdConditionIds[0]}`)
                    .set(...authHeader)
                    .send(condition1)
                expect(response.status).toEqual(200)
            })

            it('read updated condition 1 values', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/header-manipulations/sets/rules/conditions/${createdConditionIds[0]}/@values`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const conditions = response.body
                expect(conditions[0].length).toEqual(4)
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
                    .patch(`/header-manipulations/sets/rules/conditions/${createdConditionIds[0]}`)
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(200)
            })

            it('read updated condition 1 values', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/header-manipulations/sets/rules/conditions/${createdConditionIds[0]}/@values`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const conditions = response.body
                expect(conditions[0].length).toEqual(0)
            })

            it('adjust non-existing condition', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/header-manipulations/sets/rules/conditions/999911111122')
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('Rule condition DELETE', () => {
        it('delete created conditions', async () => {
            for (const id of createdConditionIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/header-manipulations/sets/rules/conditions/${id}`)
                    .set(...authHeader)
                expect(result.status).toEqual(200)
            }
        })
        it('delete created rules', async () => {
            for (const id of createdRuleIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/header-manipulations/sets/rules/${id}`)
                    .set(...authHeader)
                expect(result.status).toEqual(200)
            }
        })
        it('delete created sets', async () => {
            for (const id of createdSetIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/header-manipulations/sets/${id}`)
                    .set(...authHeader)
                expect(result.status).toEqual(200)
            }
        })
        it('delete created rwr sets', async () => {
            for (const id of createdRwrSetIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/rewrite-rules/sets/${id}`)
                    .set(...authHeader)
                expect(result.status).toEqual(200)
            }
        })
    })
})
