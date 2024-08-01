import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'
import {AppModule} from '../../../../../app.module'
import {AppService} from '../../../../../app.service'
import {AuthService} from '../../../../../auth/auth.service'
import {HeaderManipulationSetModule} from '../../header-manipulation-set.module'
import {HeaderManipulationRuleModule} from '../header-manipulation-rule.module'
import {HeaderManipulationRuleConditionModule} from './header-manipulation-rule-condition.module'
import {Operation as PatchOperation} from '../../../../../helpers/patch.helper'
import {HttpExceptionFilter} from '../../../../../helpers/http-exception.filter'
import {ValidateInputPipe} from '../../../../../pipes/validate.pipe'
import {HeaderManipulationRuleConditionResponseDto} from './dto/header-manipulation-rule-condition-response.dto'
import {HeaderManipulationRuleConditionValueResponseDto} from './dto/header-manipulation-rule-condition-value-response.dto'

describe('Rule Condition', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
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

        createdSetIds = []
        createdRuleIds = []
        createdConditionIds = []

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
            const ruleset1: any = {
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
                const rule1:any = {
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

            it ('create condition 1', async () => {
                const condition1:any = {
                    rule_id: createdRuleIds[0],
                    match_type: 'header',
                    match_part: 'full',
                    match_name: 'Asd',
                    expression: 'is',
                    expression_negation: false,
                    value_type: 'input',
                    enabled: true,
                    values: ['foo', 'bar', 'baz'],
                }
                const response = await request(app.getHttpServer())
                    .post('/header-manipulations/sets/rules/conditions')
                    .set(...authHeader)
                    .send(condition1)
                expect(response.status).toEqual(201)
                createdConditionIds.push(+response.body[0].id)
            })

            it ('create condition 2', async () => {
                const condition2:any = {
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
                    .get(`/header-manipulations/sets/rules/conditions/${createdConditionIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const condition: HeaderManipulationRuleConditionResponseDto = response.body
                expect(condition.rule_id).toEqual(createdRuleIds[0])
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
                const condition1:any = {
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
                const condition:any = {
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
                const condition1:any = {
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
    })
})
