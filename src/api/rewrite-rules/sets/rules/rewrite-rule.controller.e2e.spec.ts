import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'

import {RewriteRuleResponsetDto} from './dto/rewrite-rule-response.dto'
import {RewriteRuleModule} from './rewrite-rule.module'

import {RewriteRuleSetModule} from '~/api/rewrite-rules/sets/rewrite-rule-set.module'
import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RewriteRuleDirection, RewriteRuleField} from '~/entities/internal/rewrite-rule.internal.entity'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

type RuleSetPost = {
    name: string
    reseller_id: number
    description: string
}

type RulePost = {
    set_id: number
    match_pattern: string,
    replace_pattern: string,
    description: string,
    field: RewriteRuleField,
    direction: RewriteRuleDirection,
    priority: number
    enabled: boolean
}

describe('Rewrite Rule', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let createdSetIds: number[] = []
    let createdRuleIds: number[] = []
    const creds = {username: 'administrator', password: 'administrator'}

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [RewriteRuleSetModule, RewriteRuleModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        createdSetIds = []
        createdRuleIds = []

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
            const ruleset1: RuleSetPost = {
                name: 'test_ruleset1',
                reseller_id: 1,
                description: 'test_ruleset1 description',
            }
            const ruleset2: RuleSetPost = {
                name: 'test_ruleset2',
                reseller_id: 1,
                description: 'test_ruleset2 description',
            }
            it('create set test_ruleset1', async () => {
                const response = await request(app.getHttpServer())
                    .post('/rewrite-rules/sets')
                    .set(...authHeader)
                    .send(ruleset1)
                expect(response.status).toEqual(201)
                createdSetIds.push(+response.body[0].id)
            })
            it('create set test_ruleset2', async () => {
                const response = await request(app.getHttpServer())
                    .post('/rewrite-rules/sets')
                    .set(...authHeader)
                    .send(ruleset2)
                expect(response.status).toEqual(201)
                createdSetIds.push(+response.body[0].id)
            })

            it('create rule 1', async () => {
                const rule1: RulePost = {
                    set_id: createdSetIds[0],
                    description: 'test_rule1 description',
                    priority: 100,
                    direction: RewriteRuleDirection.In,
                    replace_pattern: 'foo',
                    match_pattern: 'bar',
                    field: RewriteRuleField.Callee,
                    enabled: true,
                }
                const response = await request(app.getHttpServer())
                    .post('/rewrite-rules/sets/rules')
                    .set(...authHeader)
                    .send(rule1)
                expect(response.status).toEqual(201)
                createdRuleIds.push(+response.body[0].id)
            })

            it('create rule 2', async () => {

                const rule2: RulePost = {
                    set_id: createdSetIds[1],
                    description: 'test_rule2 description',
                    priority: 200,
                    direction: RewriteRuleDirection.In,
                    replace_pattern: 'foo',
                    match_pattern: 'bar',
                    field: RewriteRuleField.Callee,
                    enabled: false,
                }
                const response = await request(app.getHttpServer())
                    .post('/rewrite-rules/sets/rules')
                    .set(...authHeader)
                    .send(rule2)
                expect(response.status).toEqual(201)
                createdRuleIds.push(+response.body[0].id)
            })

            it('create rule 3', async () => {
                const rule3: RulePost = {
                    set_id: createdSetIds[1],
                    description: 'test_rule3 description',
                    priority: 300,
                    direction: RewriteRuleDirection.In,
                    replace_pattern: 'foo',
                    match_pattern: 'bar',
                    field: RewriteRuleField.Callee,
                    enabled: true,
                }
                const response = await request(app.getHttpServer())
                    .post('/rewrite-rules/sets/rules')
                    .set(...authHeader)
                    .send(rule3)
                expect(response.status).toEqual(201)
                createdRuleIds.push(+response.body[0].id)
            })
        })

        describe('GET', () => {
            it('read created rule 1', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/rewrite-rules/sets/rules/${createdRuleIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const rule: RewriteRuleResponsetDto = response.body
                expect(rule.set_id).toEqual(createdSetIds[0])
                expect(rule.description).toEqual('test_rule1 description')
                expect(rule.priority).toEqual(100)
                expect(rule.enabled).toEqual(true)
            })
            it('read created rule 2', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/rewrite-rules/sets/${createdSetIds[1]}/rules/${createdRuleIds[1]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const rule: RewriteRuleResponsetDto = response.body
                expect(rule.set_id).toEqual(createdSetIds[1])
                expect(rule.description).toEqual('test_rule2 description')
                expect(rule.priority).toEqual(200)
                expect(rule.enabled).toEqual(false)
            })
            it('read non-existing rule', async () => {
                const response = await request(app.getHttpServer())
                    .get('/rewrite-rules/rules/999911111122')
                    .set(...authHeader)
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            it('update rule test_rule1 > test_rule_foo', async () => {
                const rulefoo: RulePost = {
                    set_id: createdSetIds[0],
                    description: 'test_rule_foo description',
                    priority: 101,
                    direction: RewriteRuleDirection.In,
                    replace_pattern: 'foo',
                    match_pattern: 'bar',
                    field: RewriteRuleField.Callee,
                    enabled: true,
                }
                const response = await request(app.getHttpServer())
                    .put(`/rewrite-rules/sets/${createdSetIds[0]}/rules/${createdRuleIds[0]}`)
                    .set(...authHeader)
                    .send (rulefoo)
                expect(response.status).toEqual(200)
            })
            it('read updated rule', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/rewrite-rules/sets/${createdSetIds[0]}/rules/${createdRuleIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const ruleset: RewriteRuleResponsetDto = response.body
                expect(ruleset.description).toEqual('test_rule_foo description')
            })
            it('update non-existing rule', async () => {
                const rulefoo: RulePost = {
                    set_id: createdSetIds[1],
                    description: 'test_rule_foo description',
                    direction: RewriteRuleDirection.In,
                    replace_pattern: 'foo',
                    match_pattern: 'bar',
                    field: RewriteRuleField.Callee,
                    enabled: true,
                    priority:101,
                }
                const response = await request(app.getHttpServer())
                    .put('/rewrite-rules/sets/rules/999911111122')
                    .set(...authHeader)
                    .send (rulefoo)
                expect(response.status).toEqual(404)
            })
        })

        describe('PATCH', () => {
            const patch: PatchOperation[] = [
                {
                    op: 'replace',
                    path: '/description',
                    value: 'test_rule5 description',
                },
            ]
            it('adjust rule 3 -> 5', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/rewrite-rules/sets/rules/${createdRuleIds[2]}`)
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(200)
            })
            it('read updated rule  5', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/rewrite-rules/sets/rules/${createdRuleIds[2]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const ruleset: RewriteRuleResponsetDto = response.body
                expect(ruleset.description).toEqual('test_rule5 description')
            })
            it('adjust non-existing rule', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/rewrite-rules/sets/rules/999911111122')
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('Rule DELETE', () => {
        it('delete created rules', async () => {
            for (const id of createdRuleIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/rewrite-rules/sets/rules/${id}`)
                    .set(...authHeader)
                expect(result.status).toEqual(200)
            }
        })
        it('delete created sets', async () => {
            for (const id of createdSetIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/rewrite-rules/sets/${id}`)
                    .set(...authHeader)
                expect(result.status).toEqual(200)
            }
        })
    })
})
