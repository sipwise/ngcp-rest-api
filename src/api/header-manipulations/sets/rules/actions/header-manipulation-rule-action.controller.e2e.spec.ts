import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'

import {HeaderManipulationRuleActionResponseDto} from './dto/header-manipulation-rule-action-response.dto'
import {HeaderManipulationRuleActionModule} from './header-manipulation-rule-action.module'

import {HeaderManipulationSetModule} from '~/api/header-manipulations/sets/header-manipulation-set.module'
import {HeaderManipulationRuleActionRequestDto} from '~/api/header-manipulations/sets/rules/actions/dto/header-manipulation-rule-action-request.dto'
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
    const creds = {username: 'administrator', password: 'administrator'}

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
                    .post('/header-manipulations/sets/rules/actions')
                    .set(...authHeader)
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
                    .post('/header-manipulations/sets/rules/actions')
                    .set(...authHeader)
                    .send(action1)
                expect(response.status).toEqual(201)
                createdActionIds.push(+response.body[0].id)
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
                    .post('/header-manipulations/sets/rules/actions')
                    .set(...authHeader)
                    .send(action2)
                expect(response.status).toEqual(201)
                createdActionIds.push(+response.body[0].id)
            })
        })

        describe('GET', () => {
            it('read created rule action', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/header-manipulations/sets/rules/actions/${createdActionIds[0]}?expand=rwr_set_id`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const action: HeaderManipulationRuleActionResponseDto = response.body
                expect(action.rule_id).toEqual(createdRuleIds[0])
                expect(action.header).toEqual('X-Test-Header')
                expect(action.header_part).toEqual('full')
                expect((action as unknown as RuleActionWithExpand).rwr_set_id_expand).toBeDefined()
            })
            it('read non-existing action', async () => {
                const response = await request(app.getHttpServer())
                    .get('/header-manipulations/sets/rules/actions/999911111122')
                    .set(...authHeader)
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
                    .put(`/header-manipulations/sets/rules/actions/${createdActionIds[0]}`)
                    .set(...authHeader)
                    .send(action1)
                expect(response.status).toEqual(200)
            })

            it('read updated action 1', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/header-manipulations/sets/rules/actions/${createdActionIds[0]}`)
                    .set(...authHeader)
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
                    .put('/header-manipulations/sets/rules/actions/999911111122')
                    .set(...authHeader)
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
                    .patch(`/header-manipulations/sets/rules/actions/${createdActionIds[0]}`)
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(200)
            })

            it('read updated action', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/header-manipulations/sets/rules/actions/${createdActionIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const action: HeaderManipulationRuleActionResponseDto = response.body
                expect(action.header).toEqual('X-Test-Header-Bar')
                expect(action.enabled).toEqual(false)
            })

            it('adjust non-existing action', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/header-manipulations/sets/rules/actions/999911111122')
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('Rule action DELETE', () => {
        it('delete created actions', async () => {
            for (const id of createdActionIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/header-manipulations/sets/rules/actions/${id}`)
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
