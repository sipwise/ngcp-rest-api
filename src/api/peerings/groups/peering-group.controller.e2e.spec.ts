import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import {validate} from 'class-validator'
import request from 'supertest'

import {PeeringGroupResponseDto} from './dto/peering-group-response.dto'
import {PeeringGroupModule} from './peering-group.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {db} from '~/entities'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {ResponseValidationInterceptor} from '~/interceptors/validate.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

type PeeringGroupPost = {
    name: string
    description?: string | null
    contract_id: number
    priority?: number
    time_set_id?: number
}

describe('Peering Group', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let createdIds: number[] = []
    const creds = {username: 'administrator', password: 'administrator'}

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [PeeringGroupModule, AppModule],
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
            it('create group test_peeringGroup1DefaultPriority', async () => {
                const contract = await db.billing.Contract.create({
                    product_id: 2,
                }).save()
                const peeringGroup1DefaultPriority: PeeringGroupPost = {
                    name: 'test_peeringGroup1DefaultPriority',
                    description: 'test_peeringGroup1DefaultPriority description',
                    contract_id: contract.id,
                }
                const response = await request(app.getHttpServer())
                    .post('/peerings/groups')
                    .set(...authHeader)
                    .send(peeringGroup1DefaultPriority)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body[0].id)
                await db.billing.Contract.delete(contract.id)
            })
            it('create group test_peeringGroup2', async () => {
                const contract = await db.billing.Contract.create({
                    product_id: 2,
                }).save()
                const peeringGroup2: PeeringGroupPost = {
                    name: 'test_peeringGroup2',
                    description: 'test_peeringGroup2 description',
                    contract_id: contract.id,
                    priority: 2,
                }
                const response = await request(app.getHttpServer())
                    .post('/peerings/groups')
                    .set(...authHeader)
                    .send(peeringGroup2)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body[0].id)
                await db.billing.Contract.delete(contract.id)
            })
            it('fail create group with non existing system contract', async () => {
                const response = await request(app.getHttpServer())
                    .post('/peerings/groups')
                    .set(...authHeader)
                    .send({
                        name: 'test_peeringGroup3',
                        description: 'test_peeringGroup3 description',
                        contract_id: 1,
                    })
                expect(response.status).toEqual(404)
            })
            it('fail duplicate group', async () => {
                const contract = await db.billing.Contract.create({
                    product_id: 2,
                }).save()
                const success = await request(app.getHttpServer())
                    .post('/peerings/groups')
                    .set(...authHeader)
                    .send({
                        name: 'test_peeringGroup3',
                        description: 'test_peeringGroup3 description',
                        contract_id: contract.id,
                    })
                expect(success.status).toEqual(201)
                createdIds.push(+success.body[0].id)
                const fail = await request(app.getHttpServer())
                    .post('/peerings/groups')
                    .set(...authHeader)
                    .send({
                        name: 'test_peeringGroup3',
                        description: 'test_peeringGroup3 description',
                        contract_id: contract.id,
                    })
                expect(fail.status).toEqual(422)
                await db.billing.Contract.delete(contract.id)
            })
            it('validation fail on group', async () => {
                const response = await request(app.getHttpServer())
                    .post('/peerings/groups')
                    .set(...authHeader)
                    .send({unknownField: 'test'})
                expect(response.status).toEqual(422)
            })
        })
        describe('GET', () => {
            it('read created group test_peeringGroup1DefaultPriority by id', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/peerings/groups/${createdIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const group: PeeringGroupResponseDto = response.body
                expect(group.name).toEqual('test_peeringGroup1DefaultPriority')
                expect(group.priority).toEqual(1)
            })
            it('read created group test_peeringGroup1DefaultPriority by name', async () => {
                const response = await request(app.getHttpServer())
                    .get('/peerings/groups/?name=test_peeringGroup1DefaultPriority')
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const setCollection: PeeringGroupResponseDto = response.body
                expect(await validate(setCollection)).toEqual([])
                expect(setCollection).toHaveLength(2)
                expect(setCollection[1]).toEqual(1)
                const setEntries = setCollection[0]
                expect(await validate(setEntries)).toEqual([])
                expect(setEntries).toHaveLength(1)
                const group = setEntries[0]
                expect(group.name).toEqual('test_peeringGroup1DefaultPriority')
                expect(group.priority).toEqual(1)
            })
            it('read created group test_peeringGroup2', async () => {
                const response = await request(app.getHttpServer())
                    .get('/peerings/groups/?name=test_peeringGroup2')
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const setCollection: PeeringGroupResponseDto = response.body
                expect(await validate(setCollection)).toEqual([])
                expect(setCollection).toHaveLength(2)
                expect(setCollection[1]).toEqual(1)
                const setEntries = setCollection[0]
                expect(await validate(setEntries)).toEqual([])
                expect(setEntries).toHaveLength(1)
                const group = setEntries[0]
                expect(group.name).toEqual('test_peeringGroup2')
                expect(group.priority).toEqual(2)
                expect(group.description).toEqual('test_peeringGroup2 description')
            })
            it('read non-existing group', async () => {
                const response = await request(app.getHttpServer())
                    .get('/peerings/groups/999911111122')
                    .set(...authHeader)
                expect(response.status).toEqual(404)
            })
        })
        describe('PUT', () => {
            it('update group test_peeringGroup1DefaultPriority -> renamed_test_peeringGroup1DefaultPriority', async () => {
                const contract = await db.billing.Contract.create({
                    product_id: 2,
                }).save()
                const peeringGroup1DefaultPriorityUpdate: PeeringGroupPost = {
                    name: 'renamed_test_peeringGroup1DefaultPriority',
                    description: 'foo',
                    contract_id: contract.id,
                }
                const response = await request(app.getHttpServer())
                    .put(`/peerings/groups/${createdIds[0]}`)
                    .set(...authHeader)
                    .send (peeringGroup1DefaultPriorityUpdate)
                expect(response.status).toEqual(200)
            })
            it('update group test_peeringGroup2 -> renamed_test_peeringGroup2', async () => {
                const contract = await db.billing.Contract.create({
                    product_id: 2,
                }).save()
                const peeringGroup2Update: PeeringGroupPost = {
                    name: 'renamed_test_peeringGroup2',
                    description: 'bar',
                    contract_id: contract.id,
                }
                const response = await request(app.getHttpServer())
                    .put(`/peerings/groups/${createdIds[1]}`)
                    .set(...authHeader)
                    .send(peeringGroup2Update)
                expect(response.status).toEqual(200)
            })
            it('read updated group 1', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/peerings/groups/${createdIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const group: PeeringGroupResponseDto = response.body
                expect(group.name).toEqual('renamed_test_peeringGroup1DefaultPriority')
                await db.billing.Contract.delete(group.contract_id)
            })
            it('read updated group 2', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/peerings/groups/${createdIds[1]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const group: PeeringGroupResponseDto = response.body
                expect(group.name).toEqual('renamed_test_peeringGroup2')
                await db.billing.Contract.delete(group.contract_id)
            })
            it('update non-existing group', async () => {
                const response = await request(app.getHttpServer())
                    .put('/peerings/groups/999911111122')
                    .set(...authHeader)
                    .send({
                        name: 'renamed_test_peeringGroup1DefaultPriority',
                    })
                expect(response.status).toEqual(404)
            })
        })
        describe('PATCH', () => {
            const patch: PatchOperation[] = [
                {
                    op: 'replace',
                    path: '/name',
                    value: 'patched_test_peeringGroup1DefaultPriority',
                },
            ]
            it('adjust peeringGroup1DefaultPriority', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/peerings/groups/${createdIds[0]}`)
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(200)
            })
            it('read updated peeringGroup1DefaultPriority', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/peerings/groups/${createdIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const group: PeeringGroupResponseDto = response.body
                expect(group.name).toEqual('patched_test_peeringGroup1DefaultPriority')
            })
            it('adjust non-existing group', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/peerings/groups/999991111112')
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('Peering Groups DELETE', () => {
        it('delete created groups', async () => {
            for (const id of createdIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/peerings/groups/${id}`)
                    .set(...authHeader)
                expect(result.status).toEqual(200)
            }
        })
    })
})