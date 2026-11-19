import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'
import {MoreThanOrEqual} from 'typeorm'

import {PeeringGroupResponseDto} from './dto/group-response.dto'
import {PeeringGroupModule} from './group.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {setupApp} from '~/app.setup'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {ErrorEntry} from '~/helpers/errors.helper'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {validate} from '~/helpers/validate.helper'

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
    const createdPeeringGroupIds: number[] = []
    const createdContractIds: number[] = []
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const startedAt = Date.now() / 1000
    const nonPeeringContractId = 1
    const suffix = `${process.env.JEST_WORKER_ID}_${Date.now()}`
    const invalidContract = (pointer: string): [string, string][] => [[pointer, 'PEERING_CONTRACT_INVALID']]

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [PeeringGroupModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

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
            it('create group test_peeringGroup1DefaultPriority', async () => {
                const contract = await db.billing.Contract.create({
                    product_id: 2,
                }).save()
                createdContractIds.push(contract.id)
                const peeringGroup1DefaultPriority: PeeringGroupPost = {
                    name: `test_peeringGroup1DefaultPriority_${suffix}`,
                    description: 'test_peeringGroup1DefaultPriority description',
                    contract_id: contract.id,
                }
                const response = await request(app.getHttpServer())
                    .post('/api/peerings/groups')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(peeringGroup1DefaultPriority)
                expect(response.status).toEqual(201)
                createdPeeringGroupIds.push(+response.body.data[0].id)
            })
            it('create group test_peeringGroup2', async () => {
                const contract = await db.billing.Contract.create({
                    product_id: 2,
                }).save()
                createdContractIds.push(contract.id)
                const peeringGroup2: PeeringGroupPost = {
                    name: `test_peeringGroup2_${suffix}`,
                    description: 'test_peeringGroup2 description',
                    contract_id: contract.id,
                    priority: 2,
                }
                const response = await request(app.getHttpServer())
                    .post('/api/peerings/groups')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(peeringGroup2)
                expect(response.status).toEqual(201)
                createdPeeringGroupIds.push(+response.body.data[0].id)
            })
            it('fail create group with non-peering contract', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/peerings/groups')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        name: `test_peeringGroupInvalid_${suffix}`,
                        contract_id: nonPeeringContractId,
                    })
                expect(response.status).toEqual(422)
                expect(response.body.errors.map((e: ErrorEntry) => [e.pointer, e.code])).toEqual(invalidContract('/contract_id'))
            })
            it('fail create group with unknown contract', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/peerings/groups')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        name: `test_peeringGroupInvalid_${suffix}`,
                        contract_id: 999999999,
                    })
                expect(response.status).toEqual(422)
                expect(response.body.errors.map((e: ErrorEntry) => [e.pointer, e.code])).toEqual(invalidContract('/contract_id'))
            })
            it('fail create groups bulk with one non-peering contract', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/peerings/groups')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send([
                        {name: `test_peeringGroupBulk1_${suffix}`, contract_id: createdContractIds[0]},
                        {name: `test_peeringGroupBulk2_${suffix}`, contract_id: nonPeeringContractId},
                    ])
                expect(response.status).toEqual(422)
                expect(response.body.errors.map((e: ErrorEntry) => [e.pointer, e.code])).toEqual(invalidContract('/1/contract_id'))
                const created = await db.provisioning.VoipPeeringGroup.findOneBy({name: `test_peeringGroupBulk1_${suffix}`})
                expect(created).toBeNull()
            })
            it('fail duplicate group', async () => {
                const contract = await db.billing.Contract.create({
                    product_id: 2,
                }).save()
                createdContractIds.push(contract.id)
                const success = await request(app.getHttpServer())
                    .post('/api/peerings/groups')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        name: `test_peeringGroup3_${suffix}`,
                        description: 'test_peeringGroup3 description',
                        contract_id: contract.id,
                    })
                expect(success.status).toEqual(201)
                createdPeeringGroupIds.push(+success.body.data[0].id)
                const fail = await request(app.getHttpServer())
                    .post('/api/peerings/groups')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        name: `test_peeringGroup3_${suffix}`,
                        description: 'test_peeringGroup3 description',
                        contract_id: contract.id,
                    })
                expect(fail.status).toEqual(422)
            })
            it('validation fail on group', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/peerings/groups')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({unknownField: 'test'})
                expect(response.status).toEqual(422)
            })
        })
        describe('GET', () => {
            it('read created group test_peeringGroup1DefaultPriority by id', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/peerings/groups/${createdPeeringGroupIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const group: PeeringGroupResponseDto = response.body
                expect(group.name).toEqual(`test_peeringGroup1DefaultPriority_${suffix}`)
                expect(group.priority).toEqual(1)
                expect(group.has_inbound_rules).toBe(false)
            })
            it('read created group test_peeringGroup1DefaultPriority by name', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/peerings/groups/?name=test_peeringGroup1DefaultPriority_${suffix}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const setCollection = response.body
                expect(setCollection.total_count).toEqual(1)
                const setEntries: PeeringGroupResponseDto[] = setCollection.data
                expect(await validate(setEntries)).toEqual([])
                expect(setEntries).toHaveLength(1)
                const group = setEntries[0]
                expect(group.name).toEqual(`test_peeringGroup1DefaultPriority_${suffix}`)
                expect(group.priority).toEqual(1)
            })
            it('read created group test_peeringGroup2', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/peerings/groups/?name=test_peeringGroup2_${suffix}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const setCollection = response.body
                expect(setCollection.total_count).toEqual(1)
                const setEntries: PeeringGroupResponseDto[] = setCollection.data
                expect(await validate(setEntries)).toEqual([])
                expect(setEntries).toHaveLength(1)
                const group = setEntries[0]
                expect(group.name).toEqual(`test_peeringGroup2_${suffix}`)
                expect(group.priority).toEqual(2)
                expect(group.description).toEqual('test_peeringGroup2 description')
            })
            it('read non-existing group', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/peerings/groups/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })
        })
        describe('PUT', () => {
            it('update group test_peeringGroup1DefaultPriority -> renamed_test_peeringGroup1DefaultPriority', async () => {
                const contract = await db.billing.Contract.create({
                    product_id: 2,
                }).save()
                createdContractIds.push(contract.id)
                const peeringGroup1DefaultPriorityUpdate: PeeringGroupPost = {
                    name: `renamed_test_peeringGroup1DefaultPriority_${suffix}`,
                    description: 'foo',
                    contract_id: contract.id,
                }
                const response = await request(app.getHttpServer())
                    .put(`/api/peerings/groups/${createdPeeringGroupIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(peeringGroup1DefaultPriorityUpdate)
                expect(response.status).toEqual(204)
            })
            it('update group test_peeringGroup2 -> renamed_test_peeringGroup2', async () => {
                const contract = await db.billing.Contract.create({
                    product_id: 2,
                }).save()
                createdContractIds.push(contract.id)
                const peeringGroup2Update: PeeringGroupPost = {
                    name: `renamed_test_peeringGroup2_${suffix}`,
                    description: 'bar',
                    contract_id: contract.id,
                }
                const response = await request(app.getHttpServer())
                    .put(`/api/peerings/groups/${createdPeeringGroupIds[1]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(peeringGroup2Update)
                expect(response.status).toEqual(204)
            })
            it('read updated group 1', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/peerings/groups/${createdPeeringGroupIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const group: PeeringGroupResponseDto = response.body
                expect(group.name).toEqual(`renamed_test_peeringGroup1DefaultPriority_${suffix}`)
            })
            it('read updated group 2', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/peerings/groups/${createdPeeringGroupIds[1]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const group: PeeringGroupResponseDto = response.body
                expect(group.name).toEqual(`renamed_test_peeringGroup2_${suffix}`)
            })
            it('update group bulk', async () => {
                const response = await request(app.getHttpServer())
                    .put('/api/peerings/groups')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        [createdPeeringGroupIds[0]]: {name: `bulk_put_test_peeringGroup1_${suffix}`, description: 'bulk1', contract_id: createdContractIds[3]},
                        [createdPeeringGroupIds[1]]: {name: `bulk_put_test_peeringGroup2_${suffix}`, description: 'bulk2', contract_id: createdContractIds[4]},
                    })
                expect(response.status).toEqual(204)
            })
            it('read bulk updated groups', async () => {
                for (const [i, n] of [[0, 1], [1, 2]]) {
                    const response = await request(app.getHttpServer())
                        .get(`/api/peerings/groups/${createdPeeringGroupIds[i]}`)
                        .set(...authHeader)
                        .set('Accept', 'application/json')
                    expect(response.status).toEqual(200)
                    const group: PeeringGroupResponseDto = response.body
                    expect(group.name).toEqual(`bulk_put_test_peeringGroup${n}_${suffix}`)
                    expect(group.description).toEqual(`bulk${n}`)
                }
            })
            it('fail update group to non-peering contract', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/peerings/groups/${createdPeeringGroupIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({name: `bulk_put_test_peeringGroup1_${suffix}`, contract_id: nonPeeringContractId})
                expect(response.status).toEqual(422)
                expect(response.body.errors.map((e: ErrorEntry) => [e.pointer, e.code])).toEqual(invalidContract('/contract_id'))
            })
            it('fail update group bulk to unknown contract', async () => {
                const id = createdPeeringGroupIds[1]
                const response = await request(app.getHttpServer())
                    .put('/api/peerings/groups')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        [createdPeeringGroupIds[0]]: {name: `bulk_put_test_peeringGroup1_${suffix}`, description: 'bulk1', contract_id: createdContractIds[3]},
                        [id]: {name: `bulk_put_test_peeringGroup2_${suffix}`, description: 'bulk2', contract_id: 999999999},
                    })
                expect(response.status).toEqual(422)
                expect(response.body.errors.map((e: ErrorEntry) => [e.pointer, e.code])).toEqual(invalidContract(`/${id}/contract_id`))
            })
            it('update group kept on a non-peering contract', async () => {
                const legacy = await db.provisioning.VoipPeeringGroup.create({
                    name: `test_peeringGroupLegacy_${suffix}`,
                    priority: 1,
                    peering_contract_id: nonPeeringContractId,
                }).save()
                createdPeeringGroupIds.push(legacy.id)
                const keep = await request(app.getHttpServer())
                    .put(`/api/peerings/groups/${legacy.id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({name: `renamed_test_peeringGroupLegacy_${suffix}`, priority: 3, contract_id: nonPeeringContractId})
                expect(keep.status).toEqual(204)
                const move = await request(app.getHttpServer())
                    .put(`/api/peerings/groups/${legacy.id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({name: `renamed_test_peeringGroupLegacy_${suffix}`, priority: 3, contract_id: createdContractIds[0]})
                expect(move.status).toEqual(204)
                const response = await request(app.getHttpServer())
                    .get(`/api/peerings/groups/${legacy.id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const group: PeeringGroupResponseDto = response.body
                expect(group.name).toEqual(`renamed_test_peeringGroupLegacy_${suffix}`)
                expect(group.priority).toEqual(3)
                expect(group.contract_id).toEqual(createdContractIds[0])
            })
            it('update non-existing group', async () => {
                const response = await request(app.getHttpServer())
                    .put('/api/peerings/groups/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        name: `renamed_test_peeringGroup1DefaultPriority_${suffix}`,
                        contract_id: createdContractIds[createdContractIds.length - 1],
                    })
                expect(response.status).toEqual(404)
            })
        })
        describe('PATCH', () => {
            const patch: PatchOperation[] = [
                {
                    op: 'replace',
                    path: '/name',
                    value: `patched_test_peeringGroup1DefaultPriority_${suffix}`,
                },
            ]
            it('adjust peeringGroup1DefaultPriority', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/peerings/groups/${createdPeeringGroupIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(204)
            })
            it('read updated peeringGroup1DefaultPriority', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/peerings/groups/${createdPeeringGroupIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const group: PeeringGroupResponseDto = response.body
                expect(group.name).toEqual(`patched_test_peeringGroup1DefaultPriority_${suffix}`)
            })
            it('adjust groups bulk', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/peerings/groups')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send({
                        [createdPeeringGroupIds[0]]: [{op: 'replace', path: '/description', value: 'bulk_patched1'}],
                        [createdPeeringGroupIds[1]]: [{op: 'replace', path: '/name', value: `bulk_patch_test_peeringGroup2_${suffix}`}],
                    })
                expect(response.status).toEqual(204)
            })
            it('read bulk adjusted groups', async () => {
                const first = await request(app.getHttpServer())
                    .get(`/api/peerings/groups/${createdPeeringGroupIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(first.status).toEqual(200)
                expect(first.body.description).toEqual('bulk_patched1')
                expect(first.body.name).toEqual(`patched_test_peeringGroup1DefaultPriority_${suffix}`)
                const second = await request(app.getHttpServer())
                    .get(`/api/peerings/groups/${createdPeeringGroupIds[1]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(second.status).toEqual(200)
                expect(second.body.name).toEqual(`bulk_patch_test_peeringGroup2_${suffix}`)
                expect(second.body.description).toEqual('bulk2')
            })
            it('fail adjust group to non-peering contract', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/peerings/groups/${createdPeeringGroupIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/contract_id', value: nonPeeringContractId}])
                expect(response.status).toEqual(422)
                expect(response.body.errors.map((e: ErrorEntry) => [e.pointer, e.code])).toEqual(invalidContract('/contract_id'))
            })
            it('adjust non-existing group', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/peerings/groups/999991111112')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('Peering Groups DELETE', () => {
        it('delete created groups', async () => {
            for (const id of createdPeeringGroupIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/api/peerings/groups/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(result.status).toEqual(204)
            }
        })
        it('delete created contracts', async () => {
            if (createdContractIds.length)
                await db.billing.Contract.delete(createdContractIds)
        })
        it('delete created journals', async () => {
            await db.billing.Journal.delete({username: creds.username, timestamp: MoreThanOrEqual(startedAt)})
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})