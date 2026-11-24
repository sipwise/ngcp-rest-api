import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'
import {In, MoreThanOrEqual} from 'typeorm'
import {v4 as uuidv4} from 'uuid'

import {NCOSSetResponseDto} from './dto/set-response.dto'
import {NCOSSetModule} from './set.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {setupApp} from '~/app.setup'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {VoipSubscriber as BillingVoipSubscriber} from '~/entities/db/billing/voip-subscriber.mariadb.entity'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {validate} from '~/helpers/validate.helper'

type NcosSetPost = {
    name: string
    reseller_id?: number
    description: string
}

describe('NCOS Set', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let createdIds: number[] = []
    let resellerAdminId: number
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const startedAt = Date.now() / 1000
    const suffix = `${process.env.JEST_WORKER_ID}${Date.now()}`
    const resellerCreds = {username: `ncos_set_reseller_${Date.now().toString(36)}`, password: 'FFFooobarbaz123!!!'}

    const ccareLogins = {
        [RbacRole.ccare]: `mockCcareUser${process.env.JEST_WORKER_ID}`,
        [RbacRole.ccareadmin]: `mockCcareadminUser${process.env.JEST_WORKER_ID}`,
    }
    let otherResellerContractId: number
    let otherResellerId: number
    const subadminDomain = `ncos-set-${suffix}.invalid`
    const subadminUsername = `ncossetadmin${suffix}`
    let subadminContactId: number
    let subadminCustomerId: number
    let subadminBillingDomainId: number
    let subadminProvisioningDomainId: number
    let subadminProvisioningSubscriberId: number

    const insertAdmin = async (login: string, role: RbacRole, resellerId: number): Promise<void> => {
        await db.billing.Admin.delete({login: login})
        const aclRole = await db.billing.AclRole.findOneByOrFail({role: role})
        await db.billing.Admin.insert({
            reseller_id: resellerId,
            login: login,
            saltedpass: 'mockAdminSaltedpass',
            saltedpass_modify_timestamp: new Date(),
            role_id: aclRole.id,
            is_master: true,
            is_superuser: role == RbacRole.ccareadmin,
            is_system: false,
            is_ccare: true,
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
    }

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [NCOSSetModule, AppModule],
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
            const ncosset1: NcosSetPost = {
                name: `test_ncosset1_${suffix}`,
                reseller_id: 1,
                description: 'test_ncosset1 description',
            }
            const ncosset2: NcosSetPost = {
                name: `test_ncosset2_${suffix}`,
                reseller_id: 1,
                description: 'test_ncosset2 description',
            }
            it('create ncos set test_ncosset1', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/ncos/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ncosset1)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.data[0].id)
            })
            it('create ncos set test_ncosset2', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/ncos/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ncosset2)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body.data[0].id)
            })
            it('fail duplicate ncos set', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/ncos/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ncosset1)
                expect(response.status).toEqual(422)
            })
            it('validation fail ncos set', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/ncos/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({unknownField: 'test'})
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read created ncos set 1', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/ncos/sets/?name=test_ncosset1_${suffix}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const setCollection = response.body
                expect(setCollection.total_count).toEqual(1)
                const setEntries: NCOSSetResponseDto[] = setCollection.data
                expect(await validate(setEntries)).toEqual([])
                expect(setEntries).toHaveLength(1)
                const ncosset = setEntries[0]
                expect(ncosset.name).toEqual(`test_ncosset1_${suffix}`)
                expect(ncosset.reseller_id).toEqual(1)
                expect(ncosset.description).toEqual('test_ncosset1 description')
            })
            it('read created ncos set 2', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/ncos/sets/?name=test_ncosset2_${suffix}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const setCollection = response.body
                expect(setCollection.total_count).toEqual(1)
                const setEntries: NCOSSetResponseDto[] = setCollection.data
                expect(await validate(setEntries)).toEqual([])
                expect(setEntries).toHaveLength(1)
                const ncosset = setEntries[0]
                expect(ncosset.name).toEqual(`test_ncosset2_${suffix}`)
                expect(ncosset.reseller_id).toEqual(1)
                expect(ncosset.description).toEqual('test_ncosset2 description')
            })
            it('read non-existing customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/ncos/sets/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            const ncosset3: NcosSetPost = {
                name: `test_ncosset3_${suffix}`,
                reseller_id: 1,
                description: 'test_ncosset3 description',
            }
            const ncosset4: NcosSetPost = {
                name: `test_ncosset4_${suffix}`,
                reseller_id: 1,
                description: 'test_ncosset4 description',
            }
            it('update ncos set test_ncosset1 -> test_ncosset3', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/ncos/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ncosset3)
                expect(response.status).toEqual(204)
            })
            it('update ncos set test_ncosset2 -> test_ncosset4', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/ncos/sets/${createdIds[1]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ncosset4)
                expect(response.status).toEqual(204)
            })
            it('read updated ncos set 3', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/ncos/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const ncosset: NCOSSetResponseDto = response.body
                expect(ncosset.name).toEqual(`test_ncosset3_${suffix}`)
                expect(ncosset.reseller_id).toEqual(1)
                expect(ncosset.description).toEqual('test_ncosset3 description')
            })
            it('read updated ncos set 4', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/ncos/sets/${createdIds[1]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const ncosset: NCOSSetResponseDto = response.body
                expect(ncosset.name).toEqual(`test_ncosset4_${suffix}`)
                expect(ncosset.reseller_id).toEqual(1)
                expect(ncosset.description).toEqual('test_ncosset4 description')
            })
            it('update non-existing customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .put('/api/ncos/sets/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(ncosset3)
                expect(response.status).toEqual(404)
            })
        })

        describe('PATCH', () => {
            const patch: PatchOperation[] = [
                {
                    op: 'replace',
                    path: '/name',
                    value: `test_ncosset5_${suffix}`,
                },
                {
                    op: 'replace',
                    path: '/description',
                    value: 'test_ncosset5 description',
                },
            ]
            it('adjust ncos set 3 -> 5', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/ncos/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send(patch)
                expect(response.status).toEqual(204)
            })
            it('read updated ncos set 5', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/ncos/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const ncosset: NCOSSetResponseDto = response.body
                expect(ncosset.name).toEqual(`test_ncosset5_${suffix}`)
                expect(ncosset.reseller_id).toEqual(1)
                expect(ncosset.description).toEqual('test_ncosset5 description')
            })
            it('adjust non-existing customer speed dial', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/ncos/sets/999991111112')
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
                    .post('/api/ncos/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        name: `test_ncosset_no_reseller_${suffix}`,
                        description: 'no reseller_id',
                    })
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.errors)).toContain('reseller_id should not be empty')
            })
            it('fail update without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/ncos/sets/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        name: `test_ncosset_no_reseller_${suffix}`,
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
                        .patch(`/api/ncos/sets/${createdIds[0]}`)
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
                    .patch('/api/ncos/sets')
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
                    .post('/api/ncos/sets')
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...{
                        name: `test_reseller_ncosset_${suffix}`,
                        description: 'reseller',
                    }, reseller_id: 1})
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.errors)).toContain('property reseller_id should not exist')
            })
            it('create without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/ncos/sets')
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        name: `test_reseller_ncosset_${suffix}`,
                        description: 'reseller',
                    })
                expect(response.status).toEqual(201)
                resellerEntityId = +response.body.data[0].id
                createdIds.push(resellerEntityId)
            })
            it('read created by reseller', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/ncos/sets/${resellerEntityId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.reseller_id).toEqual(1)
            })
            it('fail update with reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/ncos/sets/${resellerEntityId}`)
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...{
                        name: `renamed_test_reseller_ncosset_${suffix}`,
                        description: 'reseller',
                    }, reseller_id: 1})
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.errors)).toContain('property reseller_id should not exist')
            })
            it('update without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/ncos/sets/${resellerEntityId}`)
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        name: `renamed_test_reseller_ncosset_${suffix}`,
                        description: 'reseller',
                    })
                expect(response.status).toEqual(204)
            })
            it('read updated by reseller', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/ncos/sets/${resellerEntityId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.reseller_id).toEqual(1)
            })
            it('fail patch reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/ncos/sets/${resellerEntityId}`)
                    .auth(resellerCreds.username, resellerCreds.password)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/reseller_id', value: 1}])
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.errors)).toContain('property reseller_id should not exist')
            })
            it('patch without reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/ncos/sets/${resellerEntityId}`)
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
                    .get(`/api/ncos/sets/${resellerEntityId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.reseller_id).toEqual(1)
            })
        })

        describe('as ccare roles', () => {
            let otherSetId: number
            const headers: {[role: string]: [string, string]} = {}

            const get = (role: string, url: string): request.Test => request(app.getHttpServer())
                .get(url)
                .set(...headers[role])
                .set('Accept', 'application/json')

            it('create another reseller and log in as its ccare roles', async () => {
                const now = new Date()
                otherResellerContractId = (await db.billing.Contract.create({
                    contact_id: 2, product_id: 3, status: ContractStatus.Active, create_timestamp: now, modify_timestamp: now,
                }).save()).id
                otherResellerId = (await db.billing.Reseller.create({
                    contract_id: otherResellerContractId,
                    name: `ncos_set_ccare_reseller_${suffix}`,
                    status: ResellerStatus.Active,
                }).save()).id
                for (const [role, login] of Object.entries(ccareLogins)) {
                    await insertAdmin(login, role as RbacRole, otherResellerId)
                    const auth = await request(app.getHttpServer())
                        .post('/api/auth/jwt')
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send({username: login, password: 'mockAdminPass'})
                    expect(auth.status).toEqual(201)
                    headers[role] = ['Authorization', 'Bearer ' + auth.body['access_token']]
                }
            })

            it('create ncos set of the other reseller', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/ncos/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({reseller_id: otherResellerId, name: `ccare_ncosset_${suffix}`, description: 'ccare'})
                expect(response.status).toEqual(201)
                otherSetId = +response.body.data[0].id
                createdIds.push(otherSetId)
            })

            it('list only own ncos sets as ccare', async () => {
                const response = await get(RbacRole.ccare, `/api/ncos/sets?name=*_${suffix}`)
                expect(response.status).toEqual(200)
                expect(response.body.data.map((s: NCOSSetResponseDto) => +s.id)).toEqual([otherSetId])
            })

            it('list ncos sets of all resellers as ccareadmin', async () => {
                const response = await get(RbacRole.ccareadmin, `/api/ncos/sets?name=*_${suffix}`)
                expect(response.status).toEqual(200)
                expect(response.body.data.map((s: NCOSSetResponseDto) => +s.id).sort()).toEqual([...createdIds].sort())
            })

            it.each([RbacRole.ccare, RbacRole.ccareadmin])('fail read ncos set as %s', async role => {
                const response = await get(role, `/api/ncos/sets/${otherSetId}`)
                expect(response.status).toEqual(403)
            })
        })

        describe('as subscriberadmin', () => {
            const exposedIds: number[] = []

            const asSubadmin = (req: request.Test): request.Test => req
                .auth(`${subadminUsername}@${subadminDomain}`, 'mockSubscriberWebpassword')
                .set('X-Auth-Realm', 'subscriber')
                .set('Accept', 'application/json')

            it('create a customer of the other reseller with a subscriberadmin', async () => {
                const now = new Date()
                subadminContactId = (await db.billing.Contact.create({
                    reseller_id: otherResellerId, email: `ncos_set_${suffix}@example.org`, create_timestamp: now,
                }).save()).id
                subadminCustomerId = (await db.billing.Contract.create({
                    contact_id: subadminContactId, product_id: 4, status: ContractStatus.Active, create_timestamp: now, modify_timestamp: now,
                }).save()).id
                await appService.db.query('call billing.schedule_contract_billing_profile_network(?,?,?)', [subadminCustomerId, null, ',,1,,;'])
                subadminBillingDomainId = (await db.billing.Domain.create({domain: subadminDomain, reseller_id: otherResellerId}).save()).id
                subadminProvisioningDomainId = (await db.provisioning.VoipDomain.create({domain: subadminDomain}).save()).id
                const uuid = uuidv4()
                await BillingVoipSubscriber.insert({ // insert instead of create to avoid a cyclic dependency error
                    contract_id: subadminCustomerId,
                    uuid: uuid,
                    username: subadminUsername,
                    domain_id: subadminBillingDomainId,
                    status: 'active',
                })
                subadminProvisioningSubscriberId = (await db.provisioning.VoipSubscriber.insert({
                    username: subadminUsername,
                    domain_id: subadminProvisioningDomainId,
                    uuid: uuid,
                    password: uuidv4().slice(0, 16),
                    webusername: subadminUsername,
                    webpassword: 'mockSubscriberWebpassword',
                    webpassword_modify_timestamp: now,
                    admin: true,
                    account_id: subadminCustomerId,
                })).identifiers[0].id
            })

            it.each([true, false])('create ncos set of the other reseller with expose_to_customer %s', async expose => {
                const response = await request(app.getHttpServer())
                    .post('/api/ncos/sets')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        reseller_id: otherResellerId,
                        name: `subadmin_${expose}_ncosset_${suffix}`,
                        description: 'subscriberadmin',
                        expose_to_customer: expose,
                    })
                expect(response.status).toEqual(201)
                const id = +response.body.data[0].id
                createdIds.push(id)
                if (expose)
                    exposedIds.push(id)
            })

            it('list only exposed ncos sets of the own reseller', async () => {
                const response = await asSubadmin(request(app.getHttpServer()).get(`/api/ncos/sets?name=*_${suffix}`))
                expect(response.status).toEqual(200)
                expect(response.body.data.map((s: NCOSSetResponseDto) => +s.id)).toEqual(exposedIds)
            })

            it('fail read ncos set', async () => {
                const response = await asSubadmin(request(app.getHttpServer()).get(`/api/ncos/sets/${exposedIds[0]}`))
                expect(response.status).toEqual(403)
            })

            it('fail create ncos set', async () => {
                const response = await asSubadmin(request(app.getHttpServer()).post('/api/ncos/sets'))
                    .set('Content-Type', 'application/json')
                    .send({name: `subadmin_put_${suffix}`, description: 'subscriberadmin', expose_to_customer: true})
                expect(response.status).toEqual(403)
            })

            it('fail update ncos set', async () => {
                const response = await asSubadmin(request(app.getHttpServer()).put(`/api/ncos/sets/${exposedIds[0]}`))
                    .set('Content-Type', 'application/json')
                    .send({name: `subadmin_put_${suffix}`, description: 'subscriberadmin', expose_to_customer: true})
                expect(response.status).toEqual(403)
            })

            it('fail adjust ncos set', async () => {
                const response = await asSubadmin(request(app.getHttpServer()).patch(`/api/ncos/sets/${exposedIds[0]}`))
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/description', value: 'subscriberadmin_patch'}])
                expect(response.status).toEqual(403)
            })

            it('fail delete ncos set', async () => {
                const response = await asSubadmin(request(app.getHttpServer()).delete(`/api/ncos/sets/${exposedIds[0]}`))
                    .set('Content-Type', 'application/json')
                expect(response.status).toEqual(403)
            })
        })
    })

    describe('NCOSSet DELETE', () => {
        it('delete created ncos sets', async () => {
            for (const id of createdIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/api/ncos/sets/${id}`)
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
        it('delete created journals', async () => {
            await db.billing.Journal.delete({username: In([creds.username, resellerCreds.username]), timestamp: MoreThanOrEqual(startedAt)})
        })

        it('delete created fixtures', async () => {
            if (subadminCustomerId) {
                const subscribers = await BillingVoipSubscriber.findBy({contract_id: subadminCustomerId})
                if (subscribers.length)
                    await BillingVoipSubscriber.delete(subscribers.map(sub => sub.id))
            }
            if (subadminProvisioningSubscriberId)
                await db.provisioning.VoipSubscriber.delete(subadminProvisioningSubscriberId)
            if (subadminCustomerId)
                await db.billing.Contract.delete(subadminCustomerId)
            if (subadminContactId)
                await db.billing.Contact.delete(subadminContactId)
            if (subadminBillingDomainId)
                await db.billing.Domain.delete(subadminBillingDomainId)
            if (subadminProvisioningDomainId)
                await db.provisioning.VoipDomain.delete(subadminProvisioningDomainId)
            await db.billing.Admin.delete({login: In(Object.values(ccareLogins))})
            if (otherResellerId)
                await db.billing.Reseller.delete(otherResellerId)
            if (otherResellerContractId)
                await db.billing.Contract.delete(otherResellerContractId)
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})
