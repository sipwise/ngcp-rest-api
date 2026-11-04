import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {In, MoreThanOrEqual} from 'typeorm'

import {HeaderManipulationRuleActionModule} from './action.module'
import {HeaderManipulationRuleActionResponseDto} from './dto/action-response.dto'

import {HeaderManipulationRuleActionRequestDto} from '~/api/header-manipulations/sets/rules/actions/dto/action-request.dto'
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
    name: string,
    reseller_id: number,
    description: string,
}

type RulePost = {
    set_id: number,
    name: string,
    description: string,
    priority: number,
    direction: string,
    stopper: boolean,
    enabled: boolean,
}

type RuleActionPost = {
    rule_id: number,
    header: string,
    header_part: string,
    action_type: string,
    value_part: string,
    value: string,
    enabled: boolean,
    rwr_set_id?: number,
    rwr_dp?: RwrDpEnum,
}

type RuleActionWithExpand = HeaderManipulationRuleActionRequestDto & {rwr_set_id_expand: RewriteRuleSetResponseDto}

describe('Rule Action', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let createdRwrSetIds: number[] = []
    let createdSetIds: number[] = []
    let createdRuleIds: number[] = []
    let createdActionIds: number[] = []
    const creds = {username: 'mockAdminUser', password: 'mockAdminPass'}
    const startedAt = Date.now() / 1000

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [HeaderManipulationRuleActionModule, HeaderManipulationSetModule,HeaderManipulationRuleModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        createdRwrSetIds = []
        createdSetIds = []
        createdRuleIds = []
        createdActionIds = []

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

            it ('fails to create action if only one of rwr_set_id or rwr_dp is provided', async () => {
                const action1: RuleActionPost = {
                    rule_id: createdRuleIds[0],
                    header: 'X-Test-Header',
                    header_part: 'full',
                    action_type: 'set',
                    value_part: 'full',
                    value: 'test',
                    enabled: true,
                    rwr_set_id: createdRwrSetIds[0],
                    // rwr_dp: RwrDpEnum.caller_in -> missing
                }
                const response = await request(app.getHttpServer())
                    .post('/api/header-manipulations/sets/rules/actions')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(action1)
                expect(response.status).toEqual(422)
            })

            it ('create action 1', async () => {
                const action1: RuleActionPost = {
                    rule_id: createdRuleIds[0],
                    header: 'X-Test-Header',
                    header_part: 'full',
                    action_type: 'set',
                    value_part: 'full',
                    value: 'test',
                    enabled: true,
                    rwr_set_id: createdRwrSetIds[0],
                    rwr_dp: RwrDpEnum.caller_in,
                }
                const response = await request(app.getHttpServer())
                    .post('/api/header-manipulations/sets/rules/actions')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(action1)
                expect(response.status).toEqual(201)
                createdActionIds.push(+response.body.data[0].id)
            })

            it ('create action 2', async () => {
                const action2: RuleActionPost = {
                    rule_id: createdRuleIds[0],
                    header: 'X-Test-Header2',
                    header_part: 'full',
                    action_type: 'set',
                    value_part: 'full',
                    value: 'test2',
                    enabled: true,
                }
                const response = await request(app.getHttpServer())
                    .post('/api/header-manipulations/sets/rules/actions')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(action2)
                expect(response.status).toEqual(201)
                createdActionIds.push(+response.body.data[0].id)
            })
        })

        describe('GET', () => {
            it('read created rule action', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/header-manipulations/sets/rules/actions/${createdActionIds[0]}?expand=rwr_set_id`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const action: HeaderManipulationRuleActionResponseDto = response.body
                expect(action.rule_id).toEqual(createdRuleIds[0])
                expect(action.header).toEqual('X-Test-Header')
                expect(action.header_part).toEqual('full')
                expect((action as unknown as RuleActionWithExpand).rwr_set_id_expand).toBeDefined()
            })
            it('read non-existing action', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/header-manipulations/sets/rules/actions/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            it('update action 1 header', async () => {
                const action1: RuleActionPost = {
                    rule_id: createdRuleIds[0],
                    header: 'X-Test-Header-Foo',
                    header_part: 'full',
                    action_type: 'set',
                    value_part: 'full',
                    value: 'test',
                    enabled: false,
                }
                const response = await request(app.getHttpServer())
                    .put(`/api/header-manipulations/sets/rules/actions/${createdActionIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(action1)
                expect(response.status).toEqual(204)
            })

            it('read updated action 1', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/header-manipulations/sets/rules/actions/${createdActionIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const action: HeaderManipulationRuleActionResponseDto = response.body
                expect(action.header).toEqual('X-Test-Header-Foo')
            })

            it('update non-existing action', async () => {
                const action1: RuleActionPost = {
                    rule_id: createdRuleIds[0],
                    header: 'X-Test-Header-Foo',
                    header_part: 'full',
                    action_type: 'set',
                    value_part: 'full',
                    value: 'test',
                    enabled: false,
                }
                const response = await request(app.getHttpServer())
                    .put('/api/header-manipulations/sets/rules/actions/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(action1)
                expect(response.status).toEqual(404)
            })
        })

        describe('PATCH', () => {
            const patch: PatchOperation[] = [
                {
                    op: 'replace',
                    path: '/header',
                    value: 'X-Test-Header-Bar',
                },
                {
                    op: 'replace',
                    path: '/enabled',
                    value: false,
                },
            ]

            it('adjust action header X-Test-Header-Foo -> X-Test-Header-Bar', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/header-manipulations/sets/rules/actions/${createdActionIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(204)
            })

            it('read updated action', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/header-manipulations/sets/rules/actions/${createdActionIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const action: HeaderManipulationRuleActionResponseDto = response.body
                expect(action.header).toEqual('X-Test-Header-Bar')
                expect(action.enabled).toEqual(false)
            })

            it('adjust non-existing action', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/header-manipulations/sets/rules/actions/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('Rule action DELETE', () => {
        it('delete created actions', async () => {
            for (const id of createdActionIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/api/header-manipulations/sets/rules/actions/${id}`)
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
            const headerManipulationsIds = [...createdSetIds, ...createdRuleIds, ...createdActionIds]
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
