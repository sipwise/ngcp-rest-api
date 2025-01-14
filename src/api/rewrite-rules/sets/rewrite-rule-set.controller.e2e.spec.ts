import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import {validate} from 'class-validator'
import request from 'supertest'

import {RewriteRuleSetResponseDto} from './dto/rewrite-rule-set-response.dto'
import {RewriteRuleSetModule} from './rewrite-rule-set.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {db} from '~/entities'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {ResponseValidationInterceptor} from '~/interceptors/validate.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

type EmbeddedRule = {
    set_id?: number
    match_pattern: string
    replace_pattern: string
    description: string
    direction: string
    field: string
    priority?: number
    enabled: boolean
}

type RuleSetPost = {
    name: string
    reseller_id: number
    description: string
    rules?: EmbeddedRule[]
}

describe('Rule Set', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let createdIds: number[] = []
    const creds = {username: 'administrator', password: 'administrator'}

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [RewriteRuleSetModule, AppModule],
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
            const rulesetWithSingleEmbedded: RuleSetPost = {
                name: 'test_ruleset3',
                reseller_id: 1,
                description: 'test_ruleset3_with_embedded_rules description',
                rules: [
                    {
                        match_pattern: 'test',
                        replace_pattern: 'test',
                        description: 'test',
                        direction: 'in',
                        field: 'caller',
                        enabled: true,
                    },
                ],
            }
            const rulesetWithMultipleEmbedded: RuleSetPost = {
                name: 'test_ruleset4',
                reseller_id: 1,
                description: 'test_ruleset4_with_embedded_rules description',
                rules: [
                    {
                        match_pattern: 'test',
                        replace_pattern: 'test',
                        description: 'test',
                        direction: 'in',
                        field: 'caller',
                        enabled: true,
                    },
                    {
                        match_pattern: 'test',
                        replace_pattern: 'test',
                        description: 'test',
                        direction: 'in',
                        field: 'callee',
                        enabled: true,
                    },
                ],
            }
            const rulesetWithEmptyEmbedded: RuleSetPost = {
                name: 'test_ruleset5',
                reseller_id: 1,
                description: 'test_ruleset5_with_embedded_rules description',
                rules: [],
            }
            const rulesWithInvalidEmbedded: RuleSetPost = {
                name: 'test_ruleset6',
                reseller_id: 1,
                description: 'test_ruleset6_with_invalid_embedded_rules description',
                rules: [
                    {
                        match_pattern: 'test',
                        replace_pattern: 'test',
                        description: 'test',
                        direction: 'invalid',
                        field: 'caller',
                        enabled: true,
                    },
                ],
            }
            const ruleSetWithMismatchingRuleSetId: RuleSetPost = {
                name: 'test_ruleset7',
                reseller_id: 1,
                description: 'test_ruleset7_with_mismatching_rule_set_id description',
                rules: [
                    {
                        set_id: 999999999999999,
                        match_pattern: 'test',
                        replace_pattern: 'test',
                        description: 'test',
                        direction: 'in',
                        field: 'caller',
                        enabled: true,
                    },
                ],
            }
            it('create set test_ruleset1', async () => {
                const response = await request(app.getHttpServer())
                    .post('/rewrite-rules/sets')
                    .set(...authHeader)
                    .send(ruleset1)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body[0].id)
            })
            it('create set test_ruleset2', async () => {
                const response = await request(app.getHttpServer())
                    .post('/rewrite-rules/sets')
                    .set(...authHeader)
                    .send(ruleset2)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body[0].id)
            })
            it('fail duplicate rule set', async () => {
                const response = await request(app.getHttpServer())
                    .post('/rewrite-rules/sets')
                    .set(...authHeader)
                    .send(ruleset1)
                expect(response.status).toEqual(422)
            })
            it('validation fail rule set', async () => {
                const response = await request(app.getHttpServer())
                    .post('/rewrite-rules/sets')
                    .set(...authHeader)
                    .send({unknownField: 'test'})
                expect(response.status).toEqual(422)
            })
            it('create set test_ruleset3 with a single embedded rule', async () => {
                const response = await request(app.getHttpServer())
                    .post('/rewrite-rules/sets')
                    .set(...authHeader)
                    .send(rulesetWithSingleEmbedded)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body[0].id)

                const rules = await db.provisioning.VoipRewriteRule.findBy({set_id: +response.body[0].id})
                expect(rules).toHaveLength(1)
                expect(rules[0].set_id).toEqual(+response.body[0].id)
            })
            it('create set test_ruleset4 with multiple embedded rules', async () => {
                const response = await request(app.getHttpServer())
                    .post('/rewrite-rules/sets')
                    .set(...authHeader)
                    .send(rulesetWithMultipleEmbedded)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body[0].id)

                const rules = await db.provisioning.VoipRewriteRule.findBy({set_id: +response.body[0].id})
                expect(rules).toHaveLength(2)
            })
            it('create set test_ruleset5 with empty rules array', async () => {
                const response = await request(app.getHttpServer())
                    .post('/rewrite-rules/sets')
                    .set(...authHeader)
                    .send(rulesetWithEmptyEmbedded)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body[0].id)

                const rules = await db.provisioning.VoipRewriteRule.findBy({set_id: +response.body[0].id})
                expect(rules).toHaveLength(0)
            })
            it('validation fail for embedded rule test_ruleset6', async () => {
                const response = await request(app.getHttpServer())
                    .post('/rewrite-rules/sets')
                    .set(...authHeader)
                    .send(rulesWithInvalidEmbedded)
                expect(response.status).toEqual(422)
            })
            it('create set test_ruleset7 with the correct set_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/rewrite-rules/sets')
                    .set(...authHeader)
                    .send(ruleSetWithMismatchingRuleSetId)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body[0].id)

                const rules = await db.provisioning.VoipRewriteRule.findBy({set_id: +response.body[0].id})
                expect(rules).toHaveLength(1)
                expect(rules[0].set_id).toEqual(+response.body[0].id)
            })
        })

        describe('GET', () => {
            it('read created set 1 by id', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/rewrite-rules/sets/${createdIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const ruleset: RewriteRuleSetResponseDto = response.body
                expect(ruleset.name).toEqual('test_ruleset1')
                expect(ruleset.reseller_id).toEqual(1)
                expect(ruleset.description).toEqual('test_ruleset1 description')
            })
            it('read created set 1 by name', async () => {
                const response = await request(app.getHttpServer())
                    .get('/rewrite-rules/sets/?name=test_ruleset1')
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const setCollection: RewriteRuleSetResponseDto = response.body
                expect(await validate(setCollection)).toEqual([])
                expect(setCollection).toHaveLength(2)
                expect(setCollection[1]).toEqual(1)
                const setEntries = setCollection[0]
                expect(await validate(setEntries)).toEqual([])
                expect(setEntries).toHaveLength(1)
                const ruleset = setEntries[0]
                expect(ruleset.name).toEqual('test_ruleset1')
                expect(ruleset.reseller_id).toEqual(1)
                expect(ruleset.description).toEqual('test_ruleset1 description')
            })
            it('read created rule set 2', async () => {
                const response = await request(app.getHttpServer())
                    .get('/rewrite-rules/sets/?name=test_ruleset2')
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const setCollection: RewriteRuleSetResponseDto = response.body
                expect(await validate(setCollection)).toEqual([])
                expect(setCollection).toHaveLength(2)
                expect(setCollection[1]).toEqual(1)
                const setEntries = setCollection[0]
                expect(await validate(setEntries)).toEqual([])
                expect(setEntries).toHaveLength(1)
                const ruleset = setEntries[0]
                expect(ruleset.name).toEqual('test_ruleset2')
                expect(ruleset.reseller_id).toEqual(1)
                expect(ruleset.description).toEqual('test_ruleset2 description')
            })
            it('read non-existing set', async () => {
                const response = await request(app.getHttpServer())
                    .get('/rewrite-rules/sets/999911111122')
                    .set(...authHeader)
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            const ruleSet1Update: RuleSetPost = {
                name: 'renamed_test_ruleset1',
                reseller_id: 1,
                description: 'foo',
            }
            const ruleSet2Update: RuleSetPost = {
                name: 'renamed_test_ruleset2',
                reseller_id: 1,
                description: 'bar',
            }
            it('update rule set  test_ruleset1 -> renamed_test_ruleset1', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/rewrite-rules/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .send (ruleSet1Update)
                expect(response.status).toEqual(200)
            })
            it('update rule set test_ruleset2 -> renamed_test_ruleset2', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/rewrite-rules/sets/${createdIds[1]}`)
                    .set(...authHeader)
                    .send(ruleSet2Update)
                expect(response.status).toEqual(200)
            })
            it('read updated rule set 3', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/rewrite-rules/sets/${createdIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const ruleset: RewriteRuleSetResponseDto = response.body
                expect(ruleset.name).toEqual('renamed_test_ruleset1')
                expect(ruleset.reseller_id).toEqual(1)
                expect(ruleset.description).toEqual('foo')
            })
            it('read updated rule set 4', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/rewrite-rules/sets/${createdIds[1]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const ruleset: RewriteRuleSetResponseDto = response.body
                expect(ruleset.name).toEqual('renamed_test_ruleset2')
                expect(ruleset.reseller_id).toEqual(1)
                expect(ruleset.description).toEqual('bar')
            })
            it('update non-existing set', async () => {
                const response = await request(app.getHttpServer())
                    .put('/rewrite-rules/sets/999911111122')
                    .set(...authHeader)
                    .send (ruleSet1Update)
                expect(response.status).toEqual(404)
            })
        })

        describe('PATCH', () => {
            const patch: PatchOperation[] = [
                {
                    op: 'replace',
                    path: '/name',
                    value: 'patched_test_ruleset1',
                },
                {
                    op: 'replace',
                    path: '/description',
                    value: 'patched_test_ruleset1 description',
                },
            ]
            it('adjust ruleset1', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/rewrite-rules/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(200)
            })
            it('read updated ruleset1', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/rewrite-rules/sets/${createdIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const ruleset: RewriteRuleSetResponseDto = response.body
                expect(ruleset.name).toEqual('patched_test_ruleset1')
                expect(ruleset.reseller_id).toEqual(1)
                expect(ruleset.description).toEqual('patched_test_ruleset1 description')
            })
            it('adjust non-existing set', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/rewrite-rules/sets/999991111112')
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('Rule Set DELETE', () => {
        it('delete created rule sets', async () => {
            for (const id of createdIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/rewrite-rules/sets/${id}`)
                    .set(...authHeader)
                expect(result.status).toEqual(200)
            }
        })
    })
})