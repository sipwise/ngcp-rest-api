import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {MoreThanOrEqual} from 'typeorm'

import {RewriteRuleResponseDto} from './dto/rule-response.dto'
import {RewriteRuleModule} from './rule.module'

import {RewriteRuleSetModule} from '~/api/rewrite-rules/sets/set.module'
import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {RewriteRuleDirection, RewriteRuleField} from '~/entities/internal/rewrite-rule.internal.entity'
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
    const creds = {username: 'mockAdminUser', password: 'mockAdminPass'}
    const startedAt = Date.now() / 1000

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
                    .post('/api/rewrite-rules/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ruleset1)
                expect(response.status).toEqual(201)
                createdSetIds.push(+response.body.data[0].id)
            })
            it('create set test_ruleset2', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/rewrite-rules/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ruleset2)
                expect(response.status).toEqual(201)
                createdSetIds.push(+response.body.data[0].id)
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
                    .post('/api/rewrite-rules/sets/rules')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(rule1)
                expect(response.status).toEqual(201)
                createdRuleIds.push(+response.body.data[0].id)
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
                    .post('/api/rewrite-rules/sets/rules')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(rule2)
                expect(response.status).toEqual(201)
                createdRuleIds.push(+response.body.data[0].id)
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
                    .post('/api/rewrite-rules/sets/rules')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(rule3)
                expect(response.status).toEqual(201)
                createdRuleIds.push(+response.body.data[0].id)
            })
        })

        describe('GET', () => {
            it('read created rule 1', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/rewrite-rules/sets/rules/${createdRuleIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const rule: RewriteRuleResponseDto = response.body
                expect(rule.set_id).toEqual(createdSetIds[0])
                expect(rule.description).toEqual('test_rule1 description')
                expect(rule.priority).toEqual(100)
                expect(rule.enabled).toEqual(true)
            })
            it('read created rule 2', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/rewrite-rules/sets/${createdSetIds[1]}/rules/${createdRuleIds[1]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const rule: RewriteRuleResponseDto = response.body
                expect(rule.set_id).toEqual(createdSetIds[1])
                expect(rule.description).toEqual('test_rule2 description')
                expect(rule.priority).toEqual(200)
                expect(rule.enabled).toEqual(false)
            })
            it('read non-existing rule', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/rewrite-rules/rules/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
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
                    .put(`/api/rewrite-rules/sets/${createdSetIds[0]}/rules/${createdRuleIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(rulefoo)
                expect(response.status).toEqual(204)
            })
            it('read updated rule', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/rewrite-rules/sets/${createdSetIds[0]}/rules/${createdRuleIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const ruleset: RewriteRuleResponseDto = response.body
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
                    .put('/api/rewrite-rules/sets/rules/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(rulefoo)
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
                    .patch(`/api/rewrite-rules/sets/rules/${createdRuleIds[2]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(204)
            })
            it('read updated rule  5', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/rewrite-rules/sets/rules/${createdRuleIds[2]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const ruleset: RewriteRuleResponseDto = response.body
                expect(ruleset.description).toEqual('test_rule5 description')
            })
            it('adjust non-existing rule', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/rewrite-rules/sets/rules/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('Rule DELETE', () => {
        it('delete created rules', async () => {
            for (const id of createdRuleIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/api/rewrite-rules/sets/rules/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(result.status).toEqual(204)
            }
        })
        it('delete created sets', async () => {
            for (const id of createdSetIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/api/rewrite-rules/sets/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(result.status).toEqual(204)
            }
        })
        it('delete created journals', async () => {
            await db.billing.Journal.delete({username: creds.username, timestamp: MoreThanOrEqual(startedAt)})
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})
