import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'

import {HeaderManipulationRuleResponseDto} from './dto/header-manipulation-rule-response.dto'
import {HeaderManipulationRuleModule} from './header-manipulation-rule.module'

import {HeaderManipulationSetModule} from '~/api/header-manipulations/sets/header-manipulation-set.module'
import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

describe('Rule', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let createdSetIds: number[] = []
    let createdRuleIds: number[] = []
    const creds = {username: 'administrator', password: 'administrator'}

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [HeaderManipulationSetModule,HeaderManipulationRuleModule, AppModule],
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
            const ruleset1: any = {
                name: 'test_ruleset1',
                reseller_id: 1,
                description: 'test_ruleset1 description',
            }
            const ruleset2: any = {
                name: 'test_ruleset2',
                reseller_id: 1,
                description: 'test_ruleset2 description',
            }
            it('create set test_ruleset1', async () => {
                const response = await request(app.getHttpServer())
                    .post('/header-manipulations/sets')
                    .set(...authHeader)
                    .send(ruleset1)
                expect(response.status).toEqual(201)
                createdSetIds.push(+response.body[0].id)
            })
            it('create set test_ruleset2', async () => {
                const response = await request(app.getHttpServer())
                    .post('/header-manipulations/sets')
                    .set(...authHeader)
                    .send(ruleset2)
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

            it('create rule 2', async () => {

                const rule2:any = {
                    set_id: createdSetIds[1],
                    name: 'test_rule2',
                    description: 'test_rule2 description',
                    priority: 200,
                    direction: 'a_outbound',
                    stopper: true,
                    enabled: false,
                }
                const response = await request(app.getHttpServer())
                    .post('/header-manipulations/sets/rules')
                    .set(...authHeader)
                    .send(rule2)
                expect(response.status).toEqual(201)
                createdRuleIds.push(+response.body[0].id)
            })

            it('create rule 3', async () => {
                const rule3:any = {
                    set_id: createdSetIds[1],
                    name: 'test_rule3',
                    description: 'test_rule3 description',
                    priority: 300,
                    direction: 'a_inbound',
                    stopper: true,
                    enabled: true,
                }
                const response = await request(app.getHttpServer())
                    .post('/header-manipulations/sets/rules')
                    .set(...authHeader)
                    .send(rule3)
                expect(response.status).toEqual(201)
                createdRuleIds.push(+response.body[0].id)
            })
        })

        describe('GET', () => {
            it('read created rule 1', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/header-manipulations/sets/rules/${createdRuleIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const rule: HeaderManipulationRuleResponseDto = response.body
                expect(rule.set_id).toEqual(createdSetIds[0])
                expect(rule.name).toEqual('test_rule1')
                expect(rule.description).toEqual('test_rule1 description')
                expect(rule.priority).toEqual(100)
                expect(rule.direction).toEqual('a_inbound')
                expect(rule.stopper).toEqual(false)
                expect(rule.enabled).toEqual(true)
            })
            it('read created rule 2', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/header-manipulations/sets/${createdSetIds[1]}/rules/${createdRuleIds[1]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const rule: HeaderManipulationRuleResponseDto = response.body
                expect(rule.set_id).toEqual(createdSetIds[1])
                expect(rule.name).toEqual('test_rule2')
                expect(rule.description).toEqual('test_rule2 description')
                expect(rule.priority).toEqual(200)
                expect(rule.direction).toEqual('a_outbound')
                expect(rule.stopper).toEqual(true)
                expect(rule.enabled).toEqual(false)
            })
            it('read non-existing rule', async () => {
                const response = await request(app.getHttpServer())
                    .get('/header-manipulations/rules/999911111122')
                    .set(...authHeader)
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            it('update rule test_rule1 > test_rule_foo', async () => {
                const rulefoo: any = {
                    set_id: createdSetIds[0],
                    name: 'test_rule_foo',
                    description: 'test_rule_foo description',
                    priority: 101,
                    direction: 'a_outbound',
                    stopper: true,
                    enabled: false,
                }
                const response = await request(app.getHttpServer())
                    .put(`/header-manipulations/sets/${createdSetIds[0]}/rules/${createdRuleIds[0]}`)
                    .set(...authHeader)
                    .send (rulefoo)
                expect(response.status).toEqual(200)
            })
            it('read updated rule', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/header-manipulations/sets/${createdSetIds[0]}/rules/${createdRuleIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const ruleset: HeaderManipulationRuleResponseDto = response.body
                expect(ruleset.name).toEqual('test_rule_foo')
            })
            it('update non-existing rule', async () => {
                const rulefoo: any = {
                    set_id: createdSetIds[1],
                    name: 'test_rule_foo',
                    description: 'test_rule_foo description',
                    priority: 101,
                    direction: 'a_outbound',
                    stopper: true,
                    enabled: false,
                }
                const response = await request(app.getHttpServer())
                    .put('/header-manipulations/sets/rules/999911111122')
                    .set(...authHeader)
                    .send (rulefoo)
                expect(response.status).toEqual(404)
            })
        })

        describe('PATCH', () => {
            const patch: PatchOperation[] = [
                {
                    op: 'replace',
                    path: '/name',
                    value: 'test_rule5',
                },
                {
                    op: 'replace',
                    path: '/description',
                    value: 'test_rule5 description',
                },
            ]
            it('adjust rule  3 -> 5', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/header-manipulations/sets/rules/${createdRuleIds[2]}`)
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(200)
            })
            it('read updated rule  5', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/header-manipulations/sets/rules/${createdRuleIds[2]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const ruleset: HeaderManipulationRuleResponseDto = response.body
                expect(ruleset.name).toEqual('test_rule5')
                expect(ruleset.description).toEqual('test_rule5 description')
            })
            it('adjust non-existing rule', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/header-manipulations/sets/rules/999911111122')
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
