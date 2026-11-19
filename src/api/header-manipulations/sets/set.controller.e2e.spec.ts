import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'
import {In, MoreThanOrEqual} from 'typeorm'
import {v4 as uuidv4} from 'uuid'

import {HeaderManipulationSetResponseDto} from './dto/set-response.dto'
import {HeaderManipulationSetModule} from './set.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {setupApp} from '~/app.setup'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {validate} from '~/helpers/validate.helper'

type RuleSetPost = {
    name: string
    reseller_id?: number
    description: string
}

describe('Rule Set', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let createdIds: number[] = []
    let resellerAdminId: number
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const startedAt = Date.now() / 1000
    const suffix = `_${process.env.JEST_WORKER_ID}_${Date.now().toString(36).slice(-4)}`
    const resellerCreds = {username: `hm_set_reseller_${Date.now().toString(36)}`, password: 'FFFooobarbaz123!!!'}
    const subscriberUsername = `hm_set_sub${suffix}`
    let subscriberContractId: number
    let subscriberBillingDomainId: number
    let subscriberProvisioningDomainId: number
    let billingSubscriberId: number
    let provisioningSubscriberId: number
    let subscriberSetId: number

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [HeaderManipulationSetModule, AppModule],
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
            it('create set test_ruleset1', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/header-manipulations/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ruleset1)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.data[0].id)
            })
            it('create set test_ruleset2', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/header-manipulations/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ruleset2)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.data[0].id)
            })
            it('fail duplicate rule set', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/header-manipulations/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ruleset1)
                expect(response.status).toEqual(422)
            })
            it('validation fail rule set', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/header-manipulations/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({unknownField: 'test'})
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read created set 1 by id', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/header-manipulations/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const ruleset: HeaderManipulationSetResponseDto = response.body
                expect(ruleset.name).toEqual(`test_ruleset1${suffix}`)
                expect(ruleset.reseller_id).toEqual(1)
                expect(ruleset.description).toEqual('test_ruleset1 description')
            })
            it('read created set 1 by name', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/header-manipulations/sets/?name=test_ruleset1${suffix}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const setCollection = response.body
                expect(setCollection.total_count).toEqual(1)
                const setEntries: HeaderManipulationSetResponseDto[] = setCollection.data
                expect(await validate(setEntries)).toEqual([])
                expect(setEntries).toHaveLength(1)
                const ruleset = setEntries[0]
                expect(ruleset.name).toEqual(`test_ruleset1${suffix}`)
                expect(ruleset.reseller_id).toEqual(1)
                expect(ruleset.description).toEqual('test_ruleset1 description')
            })
            it('read created rule set 2', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/header-manipulations/sets/?name=test_ruleset2${suffix}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const setCollection = response.body
                expect(setCollection.total_count).toEqual(1)
                const setEntries: HeaderManipulationSetResponseDto[] = setCollection.data
                expect(await validate(setEntries)).toEqual([])
                expect(setEntries).toHaveLength(1)
                const ruleset = setEntries[0]
                expect(ruleset.name).toEqual(`test_ruleset2${suffix}`)
                expect(ruleset.reseller_id).toEqual(1)
                expect(ruleset.description).toEqual('test_ruleset2 description')
            })
            it('read non-existing set', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/header-manipulations/sets/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            const ruleset3: RuleSetPost = {
                name: `test ruleset3${suffix}`,
                reseller_id: 1,
                description: 'test ruleset3 description',
            }
            const ruleset4: RuleSetPost = {
                name: `test_ruleset4${suffix}`,
                reseller_id: 1,
                description: 'test_ruleset4 description',
            }
            it('update rule set test_ruleset1 -> test ruleset3', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/header-manipulations/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ruleset3)
                expect(response.status).toEqual(204)
            })
            it('update rule set test_ruleset2 -> test_ruleset4', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/header-manipulations/sets/${createdIds[1]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ruleset4)
                expect(response.status).toEqual(204)
            })
            it('read updated rule set 3', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/header-manipulations/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const ruleset: HeaderManipulationSetResponseDto = response.body
                expect(ruleset.name).toEqual(`test ruleset3${suffix}`)
                expect(ruleset.reseller_id).toEqual(1)
                expect(ruleset.description).toEqual('test ruleset3 description')
            })
            it('read updated rule set 4', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/header-manipulations/sets/${createdIds[1]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const ruleset: HeaderManipulationSetResponseDto = response.body
                expect(ruleset.name).toEqual(`test_ruleset4${suffix}`)
                expect(ruleset.reseller_id).toEqual(1)
                expect(ruleset.description).toEqual('test_ruleset4 description')
            })
            it('update non-existing set', async () => {
                const response = await request(app.getHttpServer())
                    .put('/api/header-manipulations/sets/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ruleset3)
                expect(response.status).toEqual(404)
            })
        })

        describe('PATCH', () => {
            const patch: PatchOperation[] = [
                {
                    op: 'replace',
                    path: '/name',
                    value: `test_ruleset5${suffix}`,
                },
                {
                    op: 'replace',
                    path: '/description',
                    value: 'test_ruleset5 description',
                },
            ]
            it('adjust rule set 3 -> 5', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/header-manipulations/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(204)
            })
            it('read updated rule set 5', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/header-manipulations/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const ruleset: HeaderManipulationSetResponseDto = response.body
                expect(ruleset.name).toEqual(`test_ruleset5${suffix}`)
                expect(ruleset.reseller_id).toEqual(1)
                expect(ruleset.description).toEqual('test_ruleset5 description')
            })
            it('adjust non-existing set', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/header-manipulations/sets/999991111112')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })

        describe('reseller_id as admin', () => {
            it('fail create without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/header-manipulations/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        name: `test_ruleset_no_reseller${suffix}`,
                        description: 'no reseller_id',
                    })
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.errors)).toContain('reseller_id should not be empty')
            })
            it('fail update without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/header-manipulations/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        name: `test_ruleset_no_reseller${suffix}`,
                        description: 'no reseller_id',
                    })
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.errors)).toContain('reseller_id should not be empty')
            })
            it('fail adjust with empty reseller_id', async () => {
                const tt: PatchOperation[][] = [
                    [{op: 'replace', path: '/reseller_id', value: null}],
                    [{op: 'remove', path: '/reseller_id'}],
                ]
                for (const emptyPatch of tt) {
                    const response = await request(app.getHttpServer())
                        .patch(`/api/header-manipulations/sets/${createdIds[0]}`)
                        .set(...authHeader)
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json-patch+json')
                        .send(emptyPatch)
                    expect(response.status).toEqual(422)
                    expect(JSON.stringify(response.body.errors)).toContain('reseller_id should not be empty')
                }
            })
            it('fail bulk adjust with empty reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/header-manipulations/sets')
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
        })

        describe('as reseller', () => {
            let resellerEntityId: number
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
                        email: `${resellerCreds.username}@example.com`,
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
            it('fail create with reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/header-manipulations/sets')
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...{
                        name: `test_reseller_ruleset${suffix}`,
                        description: 'reseller',
                    }, reseller_id: 1})
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.errors)).toContain('property reseller_id should not exist')
            })
            it('create without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/header-manipulations/sets')
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        name: `test_reseller_ruleset${suffix}`,
                        description: 'reseller',
                    })
                expect(response.status).toEqual(201)
                resellerEntityId = +response.body.data[0].id
                createdIds.push(resellerEntityId)
            })
            it('read created by reseller', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/header-manipulations/sets/${resellerEntityId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.reseller_id).toEqual(1)
            })
            it('fail update with reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/header-manipulations/sets/${resellerEntityId}`)
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...{
                        name: `renamed_test_reseller_ruleset${suffix}`,
                        description: 'reseller',
                    }, reseller_id: 1})
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.errors)).toContain('property reseller_id should not exist')
            })
            it('update without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/header-manipulations/sets/${resellerEntityId}`)
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        name: `renamed_test_reseller_ruleset${suffix}`,
                        description: 'reseller',
                    })
                expect(response.status).toEqual(204)
            })
            it('read updated by reseller', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/header-manipulations/sets/${resellerEntityId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.reseller_id).toEqual(1)
            })
            it('fail patch reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/header-manipulations/sets/${resellerEntityId}`)
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/reseller_id', value: 1}])
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.errors)).toContain('property reseller_id should not exist')
            })
            it('patch without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/header-manipulations/sets/${resellerEntityId}`)
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .set('Prefer', 'return=representation')
                    .send([{op: 'replace', path: '/description', value: 'patched reseller'}])
                expect(response.status).toEqual(200)
                expect(response.body.description).toEqual('patched reseller')
            })
            it('read patched by reseller', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/header-manipulations/sets/${resellerEntityId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.reseller_id).toEqual(1)
            })
        })
        describe('subscriber sets', () => {
            it('create a subscriber', async () => {
                const domain = `hm-set${suffix.replaceAll('_', '-')}.test`
                subscriberContractId = (await db.billing.Contract.create({contact_id: 1, product_id: 4}).save()).id
                subscriberBillingDomainId = (await db.billing.Domain.create({domain, reseller_id: 1}).save()).id
                subscriberProvisioningDomainId = (await db.provisioning.VoipDomain.create({domain}).save()).id
                const uuid = uuidv4()
                billingSubscriberId = (await db.billing.VoipSubscriber.insert({ // insert instead of create to avoid a cyclic dependency error
                    contract_id: subscriberContractId,
                    uuid: uuid,
                    username: subscriberUsername,
                    domain_id: subscriberBillingDomainId,
                    status: 'active',
                })).identifiers[0].id
                provisioningSubscriberId = (await db.provisioning.VoipSubscriber.insert({
                    username: subscriberUsername,
                    domain_id: subscriberProvisioningDomainId,
                    uuid: uuid,
                    password: uuidv4().slice(0, 16),
                    account_id: subscriberContractId,
                })).identifiers[0].id
            })
            it('create a set of the subscriber', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/header-manipulations/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send({name: `test_subscriber_set${suffix}`, reseller_id: 1, description: 'subscriber set', subscriber_id: billingSubscriberId})
                expect(response.status).toEqual(201)
                subscriberSetId = +response.body.data[0].id
                expect(response.body.data[0].subscriber_id).toEqual(billingSubscriberId)
            })
            it('list the sets of the subscriber', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/header-manipulations/sets?subscriber_id=${billingSubscriberId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const sets: HeaderManipulationSetResponseDto[] = response.body.data
                expect(sets.map(set => [set.id, set.subscriber_id])).toEqual([[subscriberSetId, billingSubscriberId]])
            })
            it('fail to create a set of an unknown subscriber', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/header-manipulations/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({name: `test_unknown_subscriber_set${suffix}`, reseller_id: 1, description: 'x', subscriber_id: 2147483647})
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('Rule Set DELETE', () => {
        it('delete created rule sets', async () => {
            for (const id of createdIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/api/header-manipulations/sets/${id}`)
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
        it('delete the subscriber set fixtures', async () => {
            if (subscriberSetId)
                await db.provisioning.VoipHeaderRuleSet.delete(subscriberSetId)
            if (provisioningSubscriberId)
                await db.provisioning.VoipSubscriber.delete(provisioningSubscriberId)
            if (billingSubscriberId)
                await db.billing.VoipSubscriber.delete(billingSubscriberId)
            if (subscriberBillingDomainId)
                await db.billing.Domain.delete(subscriberBillingDomainId)
            if (subscriberProvisioningDomainId)
                await db.provisioning.VoipDomain.delete(subscriberProvisioningDomainId)
            if (subscriberContractId)
                await db.billing.Contract.delete(subscriberContractId)
        })
        it('delete created journals', async () => {
            await db.billing.Journal.delete({username: In([creds.username, resellerCreds.username]), timestamp: MoreThanOrEqual(startedAt)})
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})