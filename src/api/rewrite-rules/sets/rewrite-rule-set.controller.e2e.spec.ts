import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import {validate} from 'class-validator'
import request from 'supertest'

import {RewriteRuleSetResponseDto} from './dto/rewrite-rule-set-response.dto'
import {RewriteRuleSetModule} from './rewrite-rule-set.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

type RuleSetPost = {
    name: string
    reseller_id: number
    description: string
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
            const ruleset3: RuleSetPost = {
                name: 'test ruleset3',
                reseller_id: 1,
                description: 'test ruleset3 description',
            }
            const ruleset4: RuleSetPost = {
                name: 'test_ruleset4',
                reseller_id: 1,
                description: 'test_ruleset4 description',
            }
            it('update rule set test_ruleset1 -> test ruleset3', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/rewrite-rules/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .send (ruleset3)
                expect(response.status).toEqual(200)
            })
            it('update rule set test_ruleset2 -> test_ruleset4', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/rewrite-rules/sets/${createdIds[1]}`)
                    .set(...authHeader)
                    .send(ruleset4)
                expect(response.status).toEqual(200)
            })
            it('read updated rule set 3', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/rewrite-rules/sets/${createdIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const ruleset: RewriteRuleSetResponseDto = response.body
                expect(ruleset.name).toEqual('test ruleset3')
                expect(ruleset.reseller_id).toEqual(1)
                expect(ruleset.description).toEqual('test ruleset3 description')
            })
            it('read updated rule set 4', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/rewrite-rules/sets/${createdIds[1]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const ruleset: RewriteRuleSetResponseDto = response.body
                expect(ruleset.name).toEqual('test_ruleset4')
                expect(ruleset.reseller_id).toEqual(1)
                expect(ruleset.description).toEqual('test_ruleset4 description')
            })
            it('update non-existing set', async () => {
                const response = await request(app.getHttpServer())
                    .put('/rewrite-rules/sets/999911111122')
                    .set(...authHeader)
                    .send (ruleset3)
                expect(response.status).toEqual(404)
            })
        })

        describe('PATCH', () => {
            const patch: PatchOperation[] = [
                {
                    op: 'replace',
                    path: '/name',
                    value: 'test_ruleset5',
                },
                {
                    op: 'replace',
                    path: '/description',
                    value: 'test_ruleset5 description',
                },
            ]
            it('adjust rule set 3 -> 5', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/rewrite-rules/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(200)
            })
            it('read updated rule set 5', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/rewrite-rules/sets/${createdIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const ruleset: RewriteRuleSetResponseDto = response.body
                expect(ruleset.name).toEqual('test_ruleset5')
                expect(ruleset.reseller_id).toEqual(1)
                expect(ruleset.description).toEqual('test_ruleset5 description')
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