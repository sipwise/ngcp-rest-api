import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'
import {In, MoreThanOrEqual} from 'typeorm'

import {RewriteRuleSetResponseDto} from './dto/set-response.dto'
import {RewriteRuleSetModule} from './set.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {setupApp} from '~/app.setup'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'
import {ErrorEntry} from '~/helpers/errors.helper'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {validate} from '~/helpers/validate.helper'

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
    reseller_id?: number
    description: string
    rules?: EmbeddedRule[]
}

describe('Rule Set', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let createdIds: number[] = []
    let resellerAdminId: number
    let otherResellerContractId: number
    let otherResellerId: number
    let otherResellerSetId: number
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const startedAt = Date.now() / 1000
    const suffix = `_${process.env.JEST_WORKER_ID}_${Date.now().toString(36).slice(-4)}`
    const resellerCreds = {username: `rwr_set_reseller_${Date.now().toString(36)}`, password: 'FFFooobarbaz123!!!'}

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [RewriteRuleSetModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        createdIds = []

        app = moduleRef.createNestApplication()

        app.setGlobalPrefix('api')
        setupApp(app)

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
        jest.spyOn(authService, 'compareBcryptPassword').mockImplementation(() => Promise.resolve(true))
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
            const ruleset1: RuleSetPost = {
                name: `test_ruleset1${suffix}`,
                reseller_id: 1,
                description: 'test_ruleset1 description',
            }
            const ruleset2: RuleSetPost = {
                name: `test_ruleset2${suffix}`,
                reseller_id: 1,
                description: 'test_ruleset2 description',
            }
            const rulesetWithSingleEmbedded: RuleSetPost = {
                name: `test_ruleset3${suffix}`,
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
                name: `test_ruleset4${suffix}`,
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
                name: `test_ruleset5${suffix}`,
                reseller_id: 1,
                description: 'test_ruleset5_with_embedded_rules description',
                rules: [],
            }
            const rulesWithInvalidEmbedded: RuleSetPost = {
                name: `test_ruleset6${suffix}`,
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
                name: `test_ruleset7${suffix}`,
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
                    .post('/api/rewrite-rules/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ruleset1)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.data[0].id)
            })
            it('create set test_ruleset2', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/rewrite-rules/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ruleset2)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.data[0].id)
            })
            it('fail duplicate rule set', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/rewrite-rules/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ruleset1)
                expect(response.status).toEqual(422)
            })
            it('fail create set without reseller_id as admin', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/rewrite-rules/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({name: `test_ruleset_no_reseller${suffix}`, description: 'no reseller_id'})
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.errors)).toContain('reseller_id should not be empty')
            })
            it('validation fail rule set', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/rewrite-rules/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({unknownField: 'test'})
                expect(response.status).toEqual(422)
            })
            it('fail create set with an invalid embedded rule', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/rewrite-rules/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        ...rulesetWithMultipleEmbedded,
                        rules: [
                            rulesetWithMultipleEmbedded.rules[0],
                            {...rulesetWithMultipleEmbedded.rules[1], replace_pattern: '+43 \\1', direction: 'sideways'},
                        ],
                    })
                expect(response.status).toEqual(422)
                expect(response.body.errorCode).toEqual('VALIDATION_FAILED')
                expect(response.body.errors).toEqual([
                    {pointer: '/rules/1/replace_pattern', code: 'containsSpaces', message: 'replace_pattern cannot contain spaces'},
                    {pointer: '/rules/1/direction', code: 'isEnum', message: 'direction must be one of the following values: in, out, lnp'},
                ])
            })
            it('fail create set with invalid rules among many embedded rules', async () => {
                const rule = rulesetWithMultipleEmbedded.rules[0]
                const rules: object[] = Array.from({length: 1200}, () => rule)
                rules[3] = {...rule, direction: 'sideways'}
                rules[1100] = {...rule, replace_pattern: '+43 \\1', unknown_field: 1}
                const response = await request(app.getHttpServer())
                    .post('/api/rewrite-rules/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...rulesetWithMultipleEmbedded, rules})
                expect(response.status).toEqual(422)
                expect(response.body.errors).toEqual([
                    {pointer: '/rules/3/direction', code: 'isEnum', message: 'direction must be one of the following values: in, out, lnp'},
                    {pointer: '/rules/1100/unknown_field', code: 'whitelistValidation', message: 'property unknown_field should not exist'},
                    {pointer: '/rules/1100/replace_pattern', code: 'containsSpaces', message: 'replace_pattern cannot contain spaces'},
                ])
            })
            it('create set with many embedded rules', async () => {
                const rules = Array.from({length: 1200}, () => rulesetWithMultipleEmbedded.rules[0])
                const response = await request(app.getHttpServer())
                    .post('/api/rewrite-rules/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...rulesetWithMultipleEmbedded, name: `test_ruleset_many${suffix}`, rules})
                expect(response.status).toEqual(201)
                const setId = +response.body.data[0].id
                createdIds.push(setId)
                expect(await db.provisioning.VoipRewriteRule.countBy({set_id: setId})).toEqual(1200)
            })
            it('create set test_ruleset3 with a single embedded rule', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/rewrite-rules/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(rulesetWithSingleEmbedded)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.data[0].id)

                const rules = await db.provisioning.VoipRewriteRule.findBy({set_id: +response.body.data[0].id})
                expect(rules).toHaveLength(1)
                expect(rules[0].set_id).toEqual(+response.body.data[0].id)
            })
            it('create set test_ruleset4 with multiple embedded rules', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/rewrite-rules/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(rulesetWithMultipleEmbedded)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.data[0].id)

                const rules = await db.provisioning.VoipRewriteRule.findBy({set_id: +response.body.data[0].id})
                expect(rules).toHaveLength(2)
            })
            it('create set test_ruleset5 with empty rules array', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/rewrite-rules/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(rulesetWithEmptyEmbedded)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.data[0].id)

                const rules = await db.provisioning.VoipRewriteRule.findBy({set_id: +response.body.data[0].id})
                expect(rules).toHaveLength(0)
            })
            it('validation fail for embedded rule test_ruleset6', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/rewrite-rules/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(rulesWithInvalidEmbedded)
                expect(response.status).toEqual(422)
            })
            it('create set test_ruleset7 with the correct set_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/rewrite-rules/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ruleSetWithMismatchingRuleSetId)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.data[0].id)

                const rules = await db.provisioning.VoipRewriteRule.findBy({set_id: +response.body.data[0].id})
                expect(rules).toHaveLength(1)
                expect(rules[0].set_id).toEqual(+response.body.data[0].id)
            })
        })

        describe('GET', () => {
            it('read created set 1 by id', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/rewrite-rules/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const ruleset: RewriteRuleSetResponseDto = response.body
                expect(ruleset.name).toEqual(`test_ruleset1${suffix}`)
                expect(ruleset.reseller_id).toEqual(1)
                expect(ruleset.description).toEqual('test_ruleset1 description')
            })
            it('read created set 1 by name', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/rewrite-rules/sets/?name=test_ruleset1${suffix}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const setCollection = response.body
                expect(setCollection.total_count).toEqual(1)
                const setEntries: RewriteRuleSetResponseDto[] = setCollection.data
                expect(await validate(setEntries)).toEqual([])
                expect(setEntries).toHaveLength(1)
                const ruleset = setEntries[0]
                expect(ruleset.name).toEqual(`test_ruleset1${suffix}`)
                expect(ruleset.reseller_id).toEqual(1)
                expect(ruleset.description).toEqual('test_ruleset1 description')
            })
            it('read created rule set 2', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/rewrite-rules/sets/?name=test_ruleset2${suffix}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const setCollection = response.body
                expect(setCollection.total_count).toEqual(1)
                const setEntries: RewriteRuleSetResponseDto[] = setCollection.data
                expect(await validate(setEntries)).toEqual([])
                expect(setEntries).toHaveLength(1)
                const ruleset = setEntries[0]
                expect(ruleset.name).toEqual(`test_ruleset2${suffix}`)
                expect(ruleset.reseller_id).toEqual(1)
                expect(ruleset.description).toEqual('test_ruleset2 description')
            })
            it('read non-existing set', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/rewrite-rules/sets/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            const ruleSet1Update: RuleSetPost = {
                name: `renamed_test_ruleset1${suffix}`,
                reseller_id: 1,
                description: 'foo',
            }
            const ruleSet2Update: RuleSetPost = {
                name: `renamed_test_ruleset2${suffix}`,
                reseller_id: 1,
                description: 'bar',
            }
            it('update rule set  test_ruleset1 -> renamed_test_ruleset1', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/rewrite-rules/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ruleSet1Update)
                expect(response.status).toEqual(204)
            })
            it('update rule set test_ruleset2 -> renamed_test_ruleset2', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/rewrite-rules/sets/${createdIds[1]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ruleSet2Update)
                expect(response.status).toEqual(204)
            })
            it('read updated rule set 3', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/rewrite-rules/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const ruleset: RewriteRuleSetResponseDto = response.body
                expect(ruleset.name).toEqual(`renamed_test_ruleset1${suffix}`)
                expect(ruleset.reseller_id).toEqual(1)
                expect(ruleset.description).toEqual('foo')
            })
            it('read updated rule set 4', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/rewrite-rules/sets/${createdIds[1]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const ruleset: RewriteRuleSetResponseDto = response.body
                expect(ruleset.name).toEqual(`renamed_test_ruleset2${suffix}`)
                expect(ruleset.reseller_id).toEqual(1)
                expect(ruleset.description).toEqual('bar')
            })
            it('fail update rule set without reseller_id as admin', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/rewrite-rules/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({name: `renamed_test_ruleset1${suffix}`, description: 'foo'})
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.errors)).toContain('reseller_id should not be empty')
            })
            it('update non-existing set', async () => {
                const response = await request(app.getHttpServer())
                    .put('/api/rewrite-rules/sets/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ruleSet1Update)
                expect(response.status).toEqual(404)
            })
        })

        describe('PATCH', () => {
            const patch: PatchOperation[] = [
                {
                    op: 'replace',
                    path: '/name',
                    value: `patched_test_ruleset1${suffix}`,
                },
                {
                    op: 'replace',
                    path: '/description',
                    value: 'patched_test_ruleset1 description',
                },
            ]
            it('adjust ruleset1', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/rewrite-rules/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(204)
            })
            it('read updated ruleset1', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/rewrite-rules/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const ruleset: RewriteRuleSetResponseDto = response.body
                expect(ruleset.name).toEqual(`patched_test_ruleset1${suffix}`)
                expect(ruleset.reseller_id).toEqual(1)
                expect(ruleset.description).toEqual('patched_test_ruleset1 description')
            })
            it('fail adjust ruleset1 with empty reseller_id as admin', async () => {
                const tt: PatchOperation[][] = [
                    [{op: 'replace', path: '/reseller_id', value: null}],
                    [{op: 'remove', path: '/reseller_id'}],
                ]
                for (const emptyPatch of tt) {
                    const response = await request(app.getHttpServer())
                        .patch(`/api/rewrite-rules/sets/${createdIds[0]}`)
                        .set(...authHeader)
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json-patch+json')
                        .send(emptyPatch)
                    expect(response.status).toEqual(422)
                    expect(JSON.stringify(response.body.errors)).toContain('reseller_id should not be empty')
                }
            })
            it('fail bulk adjust with empty reseller_id as admin', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/rewrite-rules/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send({
                        [createdIds[0]]: [{op: 'replace', path: '/description', value: 'bulk'}],
                        [createdIds[1]]: [{op: 'replace', path: '/reseller_id', value: null}],
                    })
                expect(response.status).toEqual(422)
                expect(response.body.errors).toContainEqual({pointer: `/${createdIds[1]}/reseller_id`, code: 'isNotEmpty', message: 'reseller_id should not be empty'})
            })
            it('adjust non-existing set', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/rewrite-rules/sets/999991111112')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT with embedded rules', () => {
            let putSetId: number
            let otherPutSetId: number
            const embedded = (props: Partial<EmbeddedRule> = {}): EmbeddedRule => ({
                match_pattern: 'test',
                replace_pattern: 'test',
                description: 'embedded',
                direction: 'in',
                field: 'callee',
                enabled: true,
                ...props,
            })
            const putSet = (path: string, payload: object): request.Test =>
                request(app.getHttpServer())
                    .put(`/api/rewrite-rules/sets${path}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(payload)
            const setBody = (name: string, rules: EmbeddedRule[]): RuleSetPost => ({name: `${name}${suffix}`, reseller_id: 1, description: name, rules})
            const rulesOf = (setId: number): Promise<db.provisioning.VoipRewriteRule[]> =>
                db.provisioning.VoipRewriteRule.find({where: {set_id: setId}, order: {id: 'ASC'}})
            const createSet = async (name: string): Promise<number> => {
                const response = await request(app.getHttpServer())
                    .post('/api/rewrite-rules/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send(setBody(name, []))
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.data[0].id)
                return +response.body.data[0].id
            }

            it('create sets', async () => {
                putSetId = await createSet('test_put_rules_set')
                otherPutSetId = await createSet('test_put_rules_other_set')
            })
            it('replace the rules of a set with rules without priority', async () => {
                const before = await db.provisioning.VoipRewriteRuleSet.findOneByOrFail({id: putSetId})
                const response = await putSet(`/${putSetId}`, setBody('test_put_rules_set', [
                    embedded({match_pattern: '^${x}', replace_pattern: '${y}'}),
                    embedded(),
                    embedded({direction: 'out'}),
                    embedded({priority: 5, field: 'caller'}),
                    embedded({field: 'caller'}),
                ]))
                expect(response.status).toEqual(204)
                const rules = await rulesOf(putSetId)
                expect(rules.map(rule => [rule.direction, rule.field, rule.priority])).toEqual([
                    ['in', 'callee', 6],
                    ['in', 'callee', 7],
                    ['out', 'callee', 8],
                    ['in', 'caller', 5],
                    ['in', 'caller', 9],
                ])
                expect(rules[0].match_pattern).toEqual('^$avp(s:x)')
                expect(rules[0].replace_pattern).toEqual('$avp(s:y)')
                const after = await db.provisioning.VoipRewriteRuleSet.findOneByOrFail({id: putSetId})
                expect(after.caller_in_dpid).toEqual(before.caller_in_dpid)
                expect(after.callee_lnp_dpid).toEqual(before.callee_lnp_dpid)
            })
            it('read the embedded rule with inflated patterns', async () => {
                const rules = await rulesOf(putSetId)
                const response = await request(app.getHttpServer())
                    .get(`/api/rewrite-rules/sets/${putSetId}/rules/${rules[0].id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.match_pattern).toEqual('^${x}')
                expect(response.body.replace_pattern).toEqual('${y}')
            })
            it('fail to replace the rules with rules of equal priorities and keep the old ones', async () => {
                const before = (await rulesOf(putSetId)).map(rule => rule.id)
                const response = await putSet(`/${putSetId}`, setBody('test_put_rules_set', [embedded({priority: 3}), embedded({priority: 3})]))
                expect(response.status).toEqual(422)
                expect((response.body.errors as ErrorEntry[]).map(e => e.code)).toEqual(['REWRITE_RULE_PRIORITY_EXISTS', 'REWRITE_RULE_PRIORITY_EXISTS'])
                expect((await rulesOf(putSetId)).map(rule => rule.id)).toEqual(before)
            })
            it('replace the rules of several sets in a bulk', async () => {
                const response = await putSet('', {
                    [putSetId]: setBody('test_put_rules_set', [embedded(), embedded()]),
                    [otherPutSetId]: setBody('test_put_rules_other_set', [embedded(), embedded({priority: 9}), embedded()]),
                })
                expect(response.status).toEqual(204)
                expect((await rulesOf(putSetId)).map(rule => rule.priority)).toEqual([1, 2])
                expect((await rulesOf(otherPutSetId)).map(rule => rule.priority)).toEqual([10, 9, 11])
            })
            it('replace the rules of a set with none', async () => {
                const response = await putSet(`/${putSetId}`, setBody('test_put_rules_set', []))
                expect(response.status).toEqual(204)
                expect(await rulesOf(putSetId)).toHaveLength(0)
            })
        })

        describe('bulk with more items than a default page', () => {
            const bulkIds: number[] = []
            it('create 12 sets', async () => {
                const sets = Array.from({length: 12}, (_, i) => ({name: `test_bulk_ruleset${i}${suffix}`, reseller_id: 1}))
                const response = await request(app.getHttpServer())
                    .post('/api/rewrite-rules/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send(sets)
                expect(response.status).toEqual(201)
                expect(response.body.data.map((set: {name: string}) => set.name)).toEqual(sets.map(set => set.name))
                bulkIds.push(...response.body.data.map((set: {id: number}) => +set.id))
                createdIds.push(...bulkIds)
            })
            it('adjust all 12 sets', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/rewrite-rules/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(Object.fromEntries(bulkIds.map(id => [id, [{op: 'replace', path: '/description', value: 'bulk'}]])))
                expect(response.status).toEqual(204)
            })
            it('delete all 12 sets', async () => {
                const response = await request(app.getHttpServer())
                    .delete('/api/rewrite-rules/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(bulkIds)
                expect(response.status).toEqual(204)
                createdIds.splice(createdIds.length - bulkIds.length)
            })
        })

        describe('POST clone', () => {
            const sourceName = `test_clone_source${suffix}`
            // 32 characters, the clone name has to be cut
            const longName = 'test_clone_long'.padEnd(32 - suffix.length, 'x') + suffix
            let sourceId: number
            let emptyId: number
            let longId: number
            let firstCloneId: number
            const dpidColumns = ['caller_in_dpid', 'callee_in_dpid', 'caller_out_dpid', 'callee_out_dpid', 'caller_lnp_dpid', 'callee_lnp_dpid'] as const
            const sourceRules: EmbeddedRule[] = [
                {
                    match_pattern: '^(${caller_cc})?([1-9][0-9]+)$',
                    replace_pattern: '\\2',
                    description: 'clone rule in',
                    direction: 'in',
                    field: 'caller',
                    priority: 5,
                    enabled: true,
                },
                {
                    match_pattern: '^00(.*)$',
                    replace_pattern: '+\\1',
                    description: 'clone rule out 10',
                    direction: 'out',
                    field: 'callee',
                    priority: 10,
                    enabled: true,
                },
                {
                    match_pattern: '^0(.*)$',
                    replace_pattern: '+43\\1',
                    description: 'clone rule out 20',
                    direction: 'out',
                    field: 'callee',
                    priority: 20,
                    enabled: false,
                },
            ]

            const createSet = async (payload: object): Promise<number> => {
                const response = await request(app.getHttpServer())
                    .post('/api/rewrite-rules/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send(payload)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.data[0].id)
                return +response.body.data[0].id
            }
            const postClone = (id: number, payload?: object): request.Test =>
                request(app.getHttpServer())
                    .post(`/api/rewrite-rules/sets/${id}/clone`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send(payload)
            const clone = async (id: number, payload: object = {}): Promise<{id: number, name: string, description: string, reseller_id: number}> => {
                const response = await postClone(id, payload)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.data[0].id)
                return response.body.data[0] as {id: number, name: string, description: string, reseller_id: number}
            }
            const rulesOf = async (setId: number): Promise<Record<string, unknown>[]> => {
                const response = await request(app.getHttpServer())
                    .get(`/api/rewrite-rules/sets/${setId}/rules`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                return (response.body.data as {priority: number}[]).sort((a, b) => a.priority - b.priority)
            }
            const dpidsOf = async (setId: number): Promise<number[]> => {
                const set = await db.provisioning.VoipRewriteRuleSet.findOneByOrFail({id: setId})
                return dpidColumns.map(column => set[column])
            }
            const dialplanRows = async (setId: number): Promise<number> => {
                const rows: {cnt: string}[] = await db.provisioning.VoipRewriteRule.query(
                    `SELECT COUNT(*) AS cnt FROM kamailio.dialplan WHERE dpid IN (${dpidColumns.map(() => '?').join(',')})`,
                    await dpidsOf(setId),
                )
                return +rows[0].cnt
            }
            const errorsOf = (response: request.Response): [string, string][] =>
                (response.body.errors as ErrorEntry[]).map(e => [e.pointer, e.code])

            it('create the source sets and another reseller', async () => {
                sourceId = await createSet({name: sourceName, reseller_id: 1, description: 'clone source', rules: sourceRules})
                emptyId = await createSet({name: `test_clone_empty${suffix}`, reseller_id: 1, description: 'no rules'})
                longId = await createSet({name: longName, reseller_id: 1})
                const now = new Date()
                otherResellerContractId = (await db.billing.Contract.create({
                    contact_id: 2, product_id: 3, status: ContractStatus.Active, create_timestamp: now, modify_timestamp: now,
                }).save()).id
                otherResellerId = (await db.billing.Reseller.create({
                    contract_id: otherResellerContractId,
                    name: `rwr_set_clone_reseller${suffix}`,
                    status: ResellerStatus.Active,
                }).save()).id
                otherResellerSetId = await createSet({name: `test_clone_other${suffix}`, reseller_id: otherResellerId})
                expect(longName).toHaveLength(32)
            })
            it('clone a set with an empty body', async () => {
                const response = await postClone(sourceId, {})
                expect(response.status).toEqual(201)
                const set = response.body.data[0]
                firstCloneId = +set.id
                createdIds.push(firstCloneId)
                expect(set).toMatchObject({name: `${sourceName}_clone`, reseller_id: 1, description: 'clone source'})
                expect(firstCloneId).not.toEqual(sourceId)
                expect(set.rules).toEqual({type: 'link', url: `/api/rewrite-rules/sets/${firstCloneId}/rules`})
                expect(response.headers.location).toEqual(`/api/rewrite-rules/sets/${firstCloneId}`)
            })
            it('copy every rule of the source into the clone', async () => {
                const copied = await rulesOf(firstCloneId)
                const original = await rulesOf(sourceId)
                expect(copied).toHaveLength(3)
                expect(copied.map(rule => rule.set_id)).toEqual([firstCloneId, firstCloneId, firstCloneId])
                const fields = (rule: Record<string, unknown>): unknown[] =>
                    [rule.match_pattern, rule.replace_pattern, rule.description, rule.direction, rule.field, rule.priority, rule.enabled]
                expect(copied.map(fields)).toEqual(original.map(fields))
                expect(copied.map(rule => rule.match_pattern)).toContain(sourceRules[0].match_pattern)
                expect(copied.map(rule => rule.id).filter(id => original.some(rule => rule.id == id))).toEqual([])
            })
            it('keep the rules of the source unchanged', async () => {
                const original = await rulesOf(sourceId)
                expect(original).toHaveLength(3)
                expect(original.every(rule => rule.set_id == sourceId)).toBe(true)
            })
            it('give the clone its own dpids and dialplan rows', async () => {
                const sourceDpids = await dpidsOf(sourceId)
                const cloneDpids = await dpidsOf(firstCloneId)
                expect(cloneDpids.every(dpid => dpid != null)).toBe(true)
                expect(cloneDpids.filter(dpid => sourceDpids.includes(dpid))).toEqual([])
                expect(await dialplanRows(firstCloneId)).toBeGreaterThan(0)
                expect(await dialplanRows(firstCloneId)).toEqual(await dialplanRows(sourceId))
            })
            it('count up the name suffix for the same source', async () => {
                const set = await clone(sourceId)
                expect(set.name).toEqual(`${sourceName}_clone2`)
            })
            it('link the clone with Prefer return=link', async () => {
                const response = await request(app.getHttpServer())
                    .post(`/api/rewrite-rules/sets/${emptyId}/clone`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=link')
                    .send({name: `test_clone_link${suffix}`})
                expect(response.status).toEqual(201)
                const id = +response.headers.location.split('/').pop()
                createdIds.push(id)
                expect(response.body.links).toEqual([`/api/rewrite-rules/sets/${id}`])
            })
            it('clone a set without rules', async () => {
                const set = await clone(emptyId)
                expect(set.name).toEqual(`test_clone_empty${suffix}_clone`)
                expect(await rulesOf(set.id)).toEqual([])
            })
            it('cut the name of a 32 character source', async () => {
                const set = await clone(longId)
                expect(set.name).toHaveLength(32)
                expect(set.name).toEqual(longName.slice(0, 26) + '_clone')
            })
            it('use the fields of the body', async () => {
                const set = await clone(sourceId, {name: `test_clone_given${suffix}`, description: 'given'})
                expect(set).toMatchObject({name: `test_clone_given${suffix}`, description: 'given'})
            })
            it('clear the description with null', async () => {
                const set = await clone(sourceId, {name: `test_clone_null${suffix}`, description: null})
                expect(set.description).toBeNull()
            })
            it('journal the clone as a create of the set', async () => {
                const journal = await db.billing.Journal.findOneByOrFail({resource_name: 'rewrite-rules/sets', resource_id: firstCloneId, timestamp: MoreThanOrEqual(startedAt)})
                expect(journal.operation).toEqual('create')
            })
            it('fail with a name that already exists', async () => {
                const response = await postClone(sourceId, {name: sourceName})
                expect(response.status).toEqual(422)
                expect(response.body.errorCode).toEqual('DUPLICATE_ENTRY')
            })
            it('fail to clear the required name', async () => {
                const response = await postClone(sourceId, {name: null})
                expect(response.status).toEqual(422)
                expect(new Set(errorsOf(response).map(([pointer]) => pointer))).toEqual(new Set(['/name']))
            })
            it('fail with rules in the body', async () => {
                const response = await postClone(sourceId, {rules: []})
                expect(response.status).toEqual(422)
                expect(errorsOf(response)).toEqual([['/rules', 'whitelistValidation']])
            })
            it('fail with an unknown field', async () => {
                const response = await postClone(sourceId, {unknownField: 'test'})
                expect(response.status).toEqual(422)
            })
            it('fail for an unknown set', async () => {
                const response = await postClone(999911111122)
                expect(response.status).toEqual(404)
            })
            it('clone into the reseller of the body as admin', async () => {
                const set = await clone(sourceId, {name: `test_clone_reseller${suffix}`, reseller_id: otherResellerId})
                expect(set.reseller_id).toEqual(otherResellerId)
            })
            it('fail to clear the reseller_id as admin', async () => {
                const response = await postClone(sourceId, {reseller_id: null})
                expect(response.status).toEqual(422)
                expect(errorsOf(response)).toEqual([['/reseller_id', 'isNotEmpty']])
            })
            it('clone without a body', async () => {
                const response = await request(app.getHttpServer())
                    .post(`/api/rewrite-rules/sets/${emptyId}/clone`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.data[0].id)
                expect(response.body.data[0].name).toEqual(`test_clone_empty${suffix}_clone2`)
            })
        })

        describe('as reseller', () => {
            let resellerSetId: number
            it('create reseller admin', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/admins')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        billing_data: true,
                        call_data: false,
                        can_reset_password: true,
                        is_active: true,
                        is_master: true,
                        email: `rwr_set_reseller${suffix}@example.com`,
                        login: resellerCreds.username,
                        password: resellerCreds.password,
                        read_only: false,
                        reseller_id: 1,
                        role: RbacRole.reseller,
                        show_passwords: true,
                        enable_2fa: false,
                    })
                expect(response.status).toEqual(201)
                resellerAdminId = +response.body.data[0].id
            })
            it('fail create set with reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/rewrite-rules/sets')
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({name: `test_reseller_ruleset${suffix}`, reseller_id: 1, description: 'reseller'})
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.errors)).toContain('property reseller_id should not exist')
            })
            it('create set without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/rewrite-rules/sets')
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({name: `test_reseller_ruleset${suffix}`, description: 'reseller'})
                expect(response.status).toEqual(201)
                resellerSetId = +response.body.data[0].id
                createdIds.push(resellerSetId)
            })
            it('read set created by reseller', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/rewrite-rules/sets/${resellerSetId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.reseller_id).toEqual(1)
            })
            it('fail update set with reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/rewrite-rules/sets/${resellerSetId}`)
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({name: `rn_test_reseller_ruleset${suffix}`, reseller_id: 1, description: 'reseller'})
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.errors)).toContain('property reseller_id should not exist')
            })
            it('update set without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/rewrite-rules/sets/${resellerSetId}`)
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send({name: `rn_test_reseller_ruleset${suffix}`, description: 'reseller'})
                expect(response.status).toEqual(200)
                expect(response.body.reseller_id).toEqual(1)
            })
            it('fail patch set reseller_id', async () => {
                const patch: PatchOperation[] = [
                    {op: 'replace', path: '/reseller_id', value: 1},
                ]
                const response = await request(app.getHttpServer())
                    .patch(`/api/rewrite-rules/sets/${resellerSetId}`)
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.errors)).toContain('property reseller_id should not exist')
            })
            it('patch set description', async () => {
                const patch: PatchOperation[] = [
                    {op: 'replace', path: '/description', value: 'patched reseller'},
                ]
                const response = await request(app.getHttpServer())
                    .patch(`/api/rewrite-rules/sets/${resellerSetId}`)
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .set('Prefer', 'return=representation')
                    .send(patch)
                expect(response.status).toEqual(200)
                expect(response.body.reseller_id).toEqual(1)
                expect(response.body.description).toEqual('patched reseller')
            })
            it('clone an own set', async () => {
                const response = await request(app.getHttpServer())
                    .post(`/api/rewrite-rules/sets/${resellerSetId}/clone`)
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send({})
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.data[0].id)
                expect(response.body.data[0].reseller_id).toEqual(1)
            })
            it('fail to clone a set of another reseller', async () => {
                const response = await request(app.getHttpServer())
                    .post(`/api/rewrite-rules/sets/${otherResellerSetId}/clone`)
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({})
                expect(response.status).toEqual(404)
            })
            it('fail to clone with reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post(`/api/rewrite-rules/sets/${resellerSetId}/clone`)
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({reseller_id: 1})
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.errors)).toContain('property reseller_id should not exist')
            })
            describe('rule clone', () => {
                const rule = (setId: number): EmbeddedRule => ({
                    set_id: setId,
                    match_pattern: '^1(.*)$',
                    replace_pattern: '\\1',
                    description: 'reseller clone rule',
                    direction: 'in',
                    field: 'caller',
                    enabled: true,
                })
                const cloneRule = (id: number, payload: object): request.Test =>
                    request(app.getHttpServer())
                        .post(`/api/rewrite-rules/sets/rules/${id}/clone`)
                        .auth(resellerCreds.username, resellerCreds.password)
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send(payload)

                it('fail to clone a rule of a set of another reseller', async () => {
                    const created = await request(app.getHttpServer())
                        .post('/api/rewrite-rules/sets/rules')
                        .set(...authHeader)
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .set('Prefer', 'return=representation')
                        .send(rule(otherResellerSetId))
                    expect(created.status).toEqual(201)
                    const response = await cloneRule(+created.body.data[0].id, {})
                    expect(response.status).toEqual(404)
                })
                it('fail to clone a rule into a set of another reseller', async () => {
                    const created = await request(app.getHttpServer())
                        .post('/api/rewrite-rules/sets/rules')
                        .auth(resellerCreds.username, resellerCreds.password)
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .set('Prefer', 'return=representation')
                        .send(rule(resellerSetId))
                    expect(created.status).toEqual(201)
                    const response = await cloneRule(+created.body.data[0].id, {set_id: otherResellerSetId})
                    expect(response.status).toEqual(422)
                    expect((response.body.errors as ErrorEntry[]).map(e => e.pointer)).toEqual(['/set_id'])
                })
            })
        })
    })

    describe('Rule Set DELETE', () => {
        it('delete created rule sets', async () => {
            for (const id of createdIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/api/rewrite-rules/sets/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(result.status).toEqual(204)
            }
        })
        it('delete reseller admin', async () => {
            if (!resellerAdminId)
                return
            const response = await request(app.getHttpServer())
                .delete(`/api/admins/${resellerAdminId}`)
                .set(...authHeader)
                .set('Accept', 'application/json')
            expect(response.status).toEqual(204)
        })
        it('delete the other reseller', async () => {
            if (otherResellerId)
                await db.billing.Reseller.delete(otherResellerId)
            if (otherResellerContractId)
                await db.billing.Contract.delete(otherResellerContractId)
        })
        it('delete created journals', async () => {
            await db.billing.Journal.delete({username: In([creds.username, resellerCreds.username]), timestamp: MoreThanOrEqual(startedAt)})
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})