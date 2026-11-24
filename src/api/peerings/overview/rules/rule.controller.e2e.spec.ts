import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'

import {PeeringRuleOverviewModule} from './rule.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {setupApp} from '~/app.setup'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'

describe('Peering Rule Overview', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let resellerAuthHeader: [string, string]
    let contractId: number
    let groupIds: number[]
    let serverIds: number[]
    let ruleIds: number[]
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const resellerCreds = {username: `mockResellerUser${process.env.JEST_WORKER_ID}`, password: 'mockResellerPass'}
    const prefix = `e2e_peer_ovr_${process.env.JEST_WORKER_ID}_${Date.now()}`
    const digits = `${process.env.JEST_WORKER_ID}${Date.now()}`

    // group A has rules 0 and 1 and servers 0 and 1, group B has rule 2 and no servers
    const rows = (): string[] => [
        `${ruleIds[0]}-${serverIds[0]}`,
        `${ruleIds[0]}-${serverIds[1]}`,
        `${ruleIds[1]}-${serverIds[0]}`,
        `${ruleIds[1]}-${serverIds[1]}`,
        `${ruleIds[2]}-0`,
    ]
    const ownGroups = (): string => `group_name=${prefix}_*`

    const readIds = async (query: string): Promise<{ids: string[], total: number}> => {
        const response = await request(app.getHttpServer())
            .get(`/api/peerings/overview/rules?${query}`)
            .set(...authHeader)
            .set('Accept', 'application/json')
        expect(response.status).toEqual(200)
        return {ids: response.body.data.map((row: {id: string}) => row.id), total: response.body.total_count}
    }

    const insertAdmin = async (login: string, role: RbacRole): Promise<void> => {
        await db.billing.Admin.delete({login})
        const aclRole = await db.billing.AclRole.findOneByOrFail({role})
        await db.billing.Admin.insert({
            reseller_id: 1,
            login,
            saltedpass: 'mockAdminSaltedpass',
            saltedpass_modify_timestamp: new Date(),
            role_id: aclRole.id,
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
    }

    const login = async (body: {username: string, password: string}): Promise<[string, string]> => {
        const response = await request(app.getHttpServer())
            .post('/api/auth/jwt')
            .set('Accept', 'application/json')
            .set('Content-Type', 'application/json')
            .send(body)
        expect(response.status).toEqual(201)
        return ['Authorization', 'Bearer ' + response.body['access_token']]
    }

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [PeeringRuleOverviewModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        app = moduleRef.createNestApplication()

        app.setGlobalPrefix('api')
        setupApp(app)

        await app.init()

        await insertAdmin(creds.username, RbacRole.admin)
        await insertAdmin(resellerCreds.username, RbacRole.reseller)

        const contract = await db.billing.Contract.create({
            contact_id: 2,
            product_id: 2,
            create_timestamp: new Date(),
            modify_timestamp: new Date(),
        }).save()
        contractId = contract.id
        const groups = await db.provisioning.VoipPeeringGroup.insert([
            {name: `${prefix}_a`, priority: 1, peering_contract_id: contractId, has_inbound_rules: false},
            {name: `${prefix}_b`, priority: 2, peering_contract_id: contractId, has_inbound_rules: false},
        ])
        groupIds = groups.identifiers.map((identifier: {id: number}) => identifier.id)
        const servers = await db.provisioning.VoipPeeringServer.insert([
            {group_id: groupIds[0], name: `${prefix}_s1`, ip: '192.0.2.1', port: 5060, transport: 1, weight: 100, enabled: true},
            {group_id: groupIds[0], name: `${prefix}_s2`, ip: '192.0.2.2', host: `${prefix}.example.org`, port: 5061, transport: 2, weight: 50, enabled: false},
        ])
        serverIds = servers.identifiers.map((identifier: {id: number}) => identifier.id)
        const rules = await db.provisioning.VoipPeeringRule.insert([
            {group_id: groupIds[0], callee_prefix: `${digits}1`, callee_pattern: '^431', description: `${prefix}_1`, enabled: true, stopper: false},
            {group_id: groupIds[0], callee_prefix: `${digits}2`, caller_pattern: '^49', description: `${prefix}_2`, enabled: false, stopper: true},
            {group_id: groupIds[1], callee_prefix: `${digits}3`, description: `${prefix}_3`, enabled: true, stopper: false},
        ])
        ruleIds = rules.identifiers.map((identifier: {id: number}) => identifier.id)
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

    it('obtain auth tokens', async () => {
        authHeader = await login(creds)
        resellerAuthHeader = await login(resellerCreds)
    })

    describe('', () => { // main tests block
        describe('GET', () => {
            it('lists one row per rule and server, a server-less rule once', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/peerings/overview/rules?${ownGroups()}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(5)
                expect(response.body.data.map((row: {id: string}) => row.id)).toEqual(rows())
                expect(response.body.data[1]).toMatchObject({
                    id: `${ruleIds[0]}-${serverIds[1]}`,
                    rule_id: ruleIds[0],
                    group_id: groupIds[0],
                    server_id: serverIds[1],
                    callee_prefix: `${digits}1`,
                    callee_pattern: '^431',
                    caller_pattern: null,
                    description: `${prefix}_1`,
                    enabled: true,
                    stopper: false,
                    group_name: `${prefix}_a`,
                    group_priority: 1,
                    server_name: `${prefix}_s2`,
                    server_host: `${prefix}.example.org`,
                    server_ip: '192.0.2.2',
                    server_port: 5061,
                    server_transport: 2,
                    server_weight: 50,
                    server_enabled: false,
                })
                expect(response.body.data[4]).toMatchObject({
                    id: `${ruleIds[2]}-0`,
                    group_id: groupIds[1],
                    server_id: null,
                    server_name: null,
                    server_host: null,
                    server_ip: null,
                    server_port: null,
                    server_transport: null,
                    server_weight: null,
                    server_enabled: null,
                })
            })

            it('pages the rows in a stable order, counting rows', async () => {
                const ids: string[] = []
                for (let page = 1; page <= 5; page++) {
                    const result = await readIds(`${ownGroups()}&rows=1&page=${page}`)
                    expect(result.total).toEqual(5)
                    expect(result.ids).toHaveLength(1)
                    ids.push(...result.ids)
                }
                expect(ids).toEqual(rows())
                expect((await readIds(`${ownGroups()}&rows=1&page=6`)).ids).toEqual([])
            })

            it('filters by rule, group and server columns', async () => {
                expect((await readIds(`${ownGroups()}&callee_prefix=${digits}1`)).ids).toEqual(rows().slice(0, 2))
                expect((await readIds(`group_name=${prefix}_b`)).ids).toEqual([rows()[4]])
                expect((await readIds(`${ownGroups()}&server_ip=192.0.2.2`)).ids).toEqual([rows()[1], rows()[3]])
                expect((await readIds(`rule_id=${ruleIds[1]}&server_id=${serverIds[0]}`)).ids).toEqual([rows()[2]])
            })

            it('keeps same-named columns of rule, group and server apart', async () => {
                expect((await readIds(`group_name=${prefix}_a&server_name=${prefix}_s1`)).ids).toEqual([rows()[0], rows()[2]])
                const result = await readIds(`${ownGroups()}&enabled=true&server_enabled=false`)
                expect(result.ids).toEqual([rows()[1]])
                expect(result.total).toEqual(1)
            })

            it('searches across rule, group and server columns with search_or', async () => {
                const result = await readIds(`search_or=1&callee_prefix=${digits}3&server_name=${prefix}_s2`)
                expect(result.ids).toEqual([rows()[1], rows()[3], rows()[4]])
                expect(result.total).toEqual(3)
            })

            it('orders by a server column and by id with the rule and server ids as tiebreak', async () => {
                expect((await readIds(`${ownGroups()}&order_by=server_ip&order_by_direction=desc`)).ids)
                    .toEqual([rows()[1], rows()[3], rows()[0], rows()[2], rows()[4]])
                expect((await readIds(`${ownGroups()}&order_by=id&order_by_direction=desc`)).ids)
                    .toEqual([rows()[4], rows()[2], rows()[3], rows()[0], rows()[1]])
                expect((await readIds(`${ownGroups()}&order_by=enabled`)).ids)
                    .toEqual([rows()[2], rows()[3], rows()[0], rows()[1], rows()[4]])
            })

            it('rejects an unknown filter', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/peerings/overview/rules?id=1-1')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(400)
            })

            it('expands rule, group and server, a missing server stays null', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/peerings/overview/rules?${ownGroups()}&expand=rule_id,group_id,server_id`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const [first, , , , last] = response.body.data
                expect(first.rule_id_expand.description).toEqual(`${prefix}_1`)
                expect(first.group_id_expand.name).toEqual(`${prefix}_a`)
                expect(first.server_id_expand.name).toEqual(`${prefix}_s1`)
                expect(last.rule_id_expand.description).toEqual(`${prefix}_3`)
                expect(last.server_id_expand).toBeNull()
            })

            it('filters by a field of the group', async () => {
                const result = await readIds(`${ownGroups()}&group_id.name=${prefix}_b`)
                expect(result.ids).toEqual([rows()[4]])
            })

            it('exports the filtered, ordered and paged rows as csv', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/peerings/overview/rules?${ownGroups()}&order_by=server_ip&order_by_direction=desc&rows=2&page=2`)
                    .set(...authHeader)
                    .set('Accept', 'text/csv')
                expect(response.status).toEqual(200)
                expect(response.headers['content-type']).toContain('text/csv')
                expect(response.headers['content-disposition']).toContain('peering_overview_rules.csv')
                const lines = response.text.trim().split(/\r?\n/)
                expect(lines).toHaveLength(3)
                expect(lines[0].split(',').slice(0, 4)).toEqual(['id', 'rule_id', 'group_id', 'server_id'])
                expect(lines[0]).toContain('server_enabled')
                expect(lines[1].split(',')[0]).toEqual(rows()[0])
                expect(lines[2].split(',')[0]).toEqual(rows()[2])
            })

            it('exports a server-less rule with empty server columns', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/peerings/overview/rules?group_name=${prefix}_b`)
                    .set(...authHeader)
                    .set('Accept', 'text/csv')
                expect(response.status).toEqual(200)
                const lines = response.text.trim().split(/\r?\n/)
                expect(lines).toHaveLength(2)
                expect(lines[1].split(',').slice(0, 4)).toEqual([rows()[4], `${ruleIds[2]}`, `${groupIds[1]}`, ''])
            })

            it('reads a row by its composed id', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/peerings/overview/rules/${rows()[3]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body).toMatchObject({
                    id: rows()[3],
                    rule_id: ruleIds[1],
                    server_id: serverIds[1],
                    enabled: false,
                    stopper: true,
                    server_name: `${prefix}_s2`,
                })
            })

            it('reads a row of a rule without server', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/peerings/overview/rules/${rows()[4]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.server_id).toBeNull()
            })

            it('returns 404 for an unknown rule or a server of another group', async () => {
                for (const id of ['999999999-1', `${ruleIds[0]}-999999999`, `${ruleIds[2]}-${serverIds[0]}`, `${ruleIds[0]}-0`]) {
                    const response = await request(app.getHttpServer())
                        .get(`/api/peerings/overview/rules/${id}`)
                        .set(...authHeader)
                        .set('Accept', 'application/json')
                    expect(response.status).toEqual(404)
                }
            })

            it('returns 400 for a malformed id', async () => {
                for (const id of ['abc', `${ruleIds[0]}`, `${ruleIds[0]}-`, `${ruleIds[0]}-${serverIds[0]}-1`]) {
                    const response = await request(app.getHttpServer())
                        .get(`/api/peerings/overview/rules/${id}`)
                        .set(...authHeader)
                        .set('Accept', 'application/json')
                    expect(response.status).toEqual(400)
                }
            })

            it('is not readable by a reseller', async () => {
                for (const path of ['', `/${rows()[0]}`]) {
                    const response = await request(app.getHttpServer())
                        .get(`/api/peerings/overview/rules${path}`)
                        .set(...resellerAuthHeader)
                        .set('Accept', 'application/json')
                    expect(response.status).toEqual(403)
                }
            })
        })
    })

    describe('Peering Rule Overview DELETE', () => {
        it('delete fixtures', async () => {
            await db.provisioning.VoipPeeringRule.delete(ruleIds)
            await db.provisioning.VoipPeeringServer.delete(serverIds)
            await db.provisioning.VoipPeeringGroup.delete(groupIds)
            await db.billing.Contract.delete(contractId)
        })
        it('delete mock admins', async () => {
            await db.billing.Admin.delete({login: creds.username})
            await db.billing.Admin.delete({login: resellerCreds.username})
        })
    })
})
