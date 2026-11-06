import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {In, MoreThanOrEqual} from 'typeorm'

import {PeeringGroupServerResponseDto} from './dto/server-response.dto'
import {PeeringGroupServerModule} from './server.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

type PeeringServerPost = {
    group_id: number
    name: string
    ip: string
    host?: string
    port: number
    transport?: number
    weight: number
    via_lb: boolean
    enabled: boolean
    probe: boolean
}

describe('Peering Server', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let contractId: number
    let groupId: number
    const createdIds: number[] = []
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const prefix = `e2e_peer_srv_${process.env.JEST_WORKER_ID}_${Date.now()}`
    const startedAt = Date.now() / 1000
    const ipBase = `10.${100 + +(process.env.JEST_WORKER_ID ?? 0)}.${Date.now() % 250}`

    const serverPost = (n: number): PeeringServerPost => ({
        group_id: groupId,
        name: `${prefix}_${n}`,
        ip: `${ipBase}.${n}`,
        host: `${prefix}_${n}.example.org`,
        port: 5060 + n,
        transport: 1,
        weight: 10 + n,
        via_lb: false,
        enabled: true,
        probe: false,
    })

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [PeeringGroupServerModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

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

        const contract = await db.billing.Contract.create({
            contact_id: 2,
            product_id: 2,
            create_timestamp: new Date(),
            modify_timestamp: new Date(),
        }).save()
        contractId = contract.id
        const group = await db.provisioning.VoipPeeringGroup.insert({
            name: prefix,
            priority: 1,
            peering_contract_id: contractId,
            has_inbound_rules: 0,
        })
        groupId = group.identifiers[0].id
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
            it('create servers', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/peerings/groups/servers')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .set('Prefer', 'return=representation')
                    .send([serverPost(1), serverPost(2)])
                expect(response.status).toEqual(201)
                const servers: PeeringGroupServerResponseDto[] = response.body.data
                expect(servers).toHaveLength(2)
                createdIds.push(...servers.map(s => +s.id))
                expect(servers[0].group_id).toEqual(groupId)
                expect(servers[0].name).toEqual(`${prefix}_1`)
                expect(servers[0].ip).toEqual(`${ipBase}.1`)
                expect(servers[0].host).toEqual(`${prefix}_1.example.org`)
                expect(servers[0].port).toEqual(5061)
                expect(servers[0].transport).toEqual(1)
                expect(servers[0].weight).toEqual(11)
                expect(servers[0].enabled).toBe(true)
                expect(servers[0].probe).toBe(false)
                expect(servers[0].via_lb).toBe(false)
            })
            it('fail to create server without name', async () => {
                const {name: _name, ...server} = serverPost(3)
                const response = await request(app.getHttpServer())
                    .post('/api/peerings/groups/servers')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(server)
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read servers of the group', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/peerings/groups/servers?group_id=${groupId}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(2)
                const servers: PeeringGroupServerResponseDto[] = response.body.data
                expect(servers.map(s => s.id).sort()).toEqual([...createdIds].sort())
            })
            it('read servers by group path', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/peerings/groups/${groupId}/servers`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(2)
                const servers: PeeringGroupServerResponseDto[] = response.body.data
                expect(servers.every(s => s.group_id == groupId)).toBe(true)
            })
            it('read server', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/peerings/groups/servers/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
                const server: PeeringGroupServerResponseDto = response.body
                expect(server.id).toEqual(createdIds[0])
                expect(server.name).toEqual(`${prefix}_1`)
                expect(server.ip).toEqual(`${ipBase}.1`)
            })
            it('read non-existing server', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/peerings/groups/servers/999911111122')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            it('update server', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/api/peerings/groups/servers/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({...serverPost(1), name: `${prefix}_1_put`, port: 5080, weight: 50, enabled: false})
                expect(response.status).toEqual(204)
                const server = await db.provisioning.VoipPeeringServer.findOneByOrFail({id: createdIds[0]})
                expect(server.name).toEqual(`${prefix}_1_put`)
                expect(server.port).toEqual(5080)
                expect(server.weight).toEqual(50)
                expect(server.enabled).toBe(false)
                expect(server.group_id).toEqual(groupId)
            })
            it('update servers bulk', async () => {
                const response = await request(app.getHttpServer())
                    .put('/api/peerings/groups/servers')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        [createdIds[0]]: {...serverPost(1), name: `${prefix}_1_bulk`},
                        [createdIds[1]]: {...serverPost(2), name: `${prefix}_2_bulk`, weight: 60, enabled: false},
                    })
                expect(response.status).toEqual(204)
                const servers = await db.provisioning.VoipPeeringServer.findBy({id: In(createdIds)})
                expect(servers.find(s => s.id == createdIds[0]).name).toEqual(`${prefix}_1_bulk`)
                expect(servers.find(s => s.id == createdIds[0]).enabled).toBe(true)
                expect(servers.find(s => s.id == createdIds[1]).name).toEqual(`${prefix}_2_bulk`)
                expect(servers.find(s => s.id == createdIds[1]).weight).toEqual(60)
                expect(servers.find(s => s.id == createdIds[1]).enabled).toBe(false)
            })
        })

        describe('PATCH', () => {
            it('adjust server', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/api/peerings/groups/servers/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send([{op: 'replace', path: '/name', value: `${prefix}_1_patch`}])
                expect(response.status).toEqual(204)
                const server = await db.provisioning.VoipPeeringServer.findOneByOrFail({id: createdIds[0]})
                expect(server.name).toEqual(`${prefix}_1_patch`)
                expect(server.ip).toEqual(`${ipBase}.1`)
                expect(server.port).toEqual(5061)
                expect(server.group_id).toEqual(groupId)
            })
            it('adjust servers bulk', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/api/peerings/groups/servers')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json-patch+json')
                    .send({
                        [createdIds[0]]: [{op: 'replace', path: '/weight', value: 70}],
                        [createdIds[1]]: [{op: 'replace', path: '/enabled', value: true}],
                    })
                expect(response.status).toEqual(204)
                const servers = await db.provisioning.VoipPeeringServer.findBy({id: In(createdIds)})
                expect(servers.find(s => s.id == createdIds[0]).weight).toEqual(70)
                expect(servers.find(s => s.id == createdIds[0]).name).toEqual(`${prefix}_1_patch`)
                expect(servers.find(s => s.id == createdIds[1]).enabled).toBe(true)
                expect(servers.find(s => s.id == createdIds[1]).name).toEqual(`${prefix}_2_bulk`)
            })
        })
    })

    describe('Peering Servers DELETE', () => {
        it('delete created servers', async () => {
            for (const id of createdIds) {
                const response = await request(app.getHttpServer())
                    .delete(`/api/peerings/groups/servers/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                expect(response.status).toEqual(204)
            }
            expect(await db.provisioning.VoipPeeringServer.countBy({group_id: groupId})).toEqual(0)
        })
        it('delete created group and contract', async () => {
            await db.provisioning.VoipPeeringServer.delete({group_id: groupId})
            await db.provisioning.VoipPeeringGroup.delete(groupId)
            await db.billing.Contract.delete(contractId)
        })
        it('delete created journals', async () => {
            await db.billing.Journal.delete({username: creds.username, timestamp: MoreThanOrEqual(startedAt)})
        })
        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
        })
    })
})
