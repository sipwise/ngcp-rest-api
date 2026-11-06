import fs from 'fs'
import path from 'path'

import {ClassSerializerInterceptor, INestApplication} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {Test} from '@nestjs/testing'
import bodyParser from 'body-parser'
import request from 'supertest'
import {MoreThanOrEqual} from 'typeorm'

import {FileshareModule} from './fileshare.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {TransactionInterceptor} from '~/interceptors/transaction.interceptor'
import {TransformInterceptor} from '~/interceptors/transform.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

type FileSharePost = {
    file: string
    ttl: number
}

describe('Fileshare', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let createdIds: number[] = []
    const creds = {username: `mockAdminUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const startedAt = Date.now() / 1000
    const resellerCreds = {username: `mockResellerUser${process.env.JEST_WORKER_ID}`, password: 'mockAdminPass'}
    const suffix = `${process.env.JEST_WORKER_ID}${Date.now()}`
    let otherResellerContractId: number
    let otherResellerId: number
    let resellerHeader: [string, string]

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [FileshareModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        createdIds = []

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
        await db.billing.Admin.delete({login: resellerCreds.username})
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
            const fileshare: FileSharePost = {
                file: 'testfile.txt',
                ttl: 3600,
            }
            it('creates file', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/fileshare')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .attach('file', path.resolve(__dirname, './fixtures/fileshare-test-file.txt'))
                    .field('ttl', fileshare.ttl)
                expect(response.status).toEqual(201)
                createdIds.push(response.body.id)
            })
            it('does not create file without file', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/fileshare')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                    .field('ttl', fileshare.ttl)
                expect(response.status).toEqual(422)
            })
        })
        describe('GET', () => {
            it('fetches all fileshares', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/fileshare')
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(response.status).toEqual(200)
            })
            it('downloads the uploaded file', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/fileshare/${createdIds[0]}`)
                    .set(...authHeader)
                    .set('Accept', '*/*')
                    .buffer(true)
                    .parse((res, cb) => {
                        const chunks: Buffer[] = []
                        res.on('data', (chunk: Buffer) => chunks.push(chunk))
                        res.on('end', () => cb(null, Buffer.concat(chunks)))
                    })
                expect(response.status).toEqual(200)
                expect(response.headers['content-type']).toMatch(/^text\/plain/)
                expect(Buffer.compare(response.body, fs.readFileSync(path.resolve(__dirname, './fixtures/fileshare-test-file.txt')))).toEqual(0)
            })
        })
        describe('user quota', () => {
            const testFile = path.resolve(__dirname, './fixtures/fileshare-test-file.txt')
            const fileSize = fs.statSync(testFile).size
            let replacedConfig: jest.ReplaceProperty<AppService['config']>
            it('create another reseller and log in as its reseller admin', async () => {
                const now = new Date()
                otherResellerContractId = (await db.billing.Contract.create({
                    contact_id: 2, product_id: 3, status: ContractStatus.Active, create_timestamp: now, modify_timestamp: now,
                }).save()).id
                otherResellerId = (await db.billing.Reseller.create({
                    contract_id: otherResellerContractId, name: `fs_reseller_${suffix}`, status: ResellerStatus.Active,
                }).save()).id
                const resellerRole = await db.billing.AclRole.findOneByOrFail({role: RbacRole.reseller})
                await db.billing.Admin.insert({
                    reseller_id: otherResellerId,
                    login: resellerCreds.username,
                    saltedpass: 'mockAdminSaltedpass',
                    saltedpass_modify_timestamp: now,
                    role_id: resellerRole.id,
                    is_master: true,
                    is_superuser: false,
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
                const response = await request(app.getHttpServer())
                    .post('/api/auth/jwt')
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(resellerCreds)
                expect(response.status).toEqual(201)
                resellerHeader = ['Authorization', 'Bearer ' + response.body['access_token']]
            })
            it('set fileshare.limits.user_quota for two files', () => {
                const fileshare = appService.config.fileshare
                replacedConfig = jest.replaceProperty(appService, 'config', {
                    ...appService.config,
                    fileshare: {...fileshare, limits: {...fileshare.limits, user_quota: 2 * fileSize + 4}},
                })
                expect(appService.config.fileshare.limits.user_quota).toEqual(2 * fileSize + 4)
            })
            it.each([1, 2])('upload file %i within the user quota', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/fileshare')
                    .set(...resellerHeader)
                    .set('Accept', 'application/json')
                    .attach('file', testFile)
                    .field('ttl', 3600)
                expect(response.status).toEqual(201)
                createdIds.push(response.body.id)
            })
            it('reject an upload exceeding the user quota', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/fileshare')
                    .set(...resellerHeader)
                    .set('Accept', 'application/json')
                    .attach('file', testFile)
                    .field('ttl', 3600)
                expect(response.status).toEqual(422)
                expect(await db.fileshare.Upload.countBy({reseller_id: otherResellerId})).toEqual(2)
            })
            it('restore fileshare.limits', () => {
                replacedConfig.restore()
                expect(appService.config.fileshare.limits.user_quota).not.toEqual(2 * fileSize + 4)
            })
        })
    })

    describe('Fileshare DELETE', () => {
        it('delete created files', async () => {
            for (const id of createdIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/api/fileshare/${id}`)
                    .set(...authHeader)
                    .set('Accept', 'application/json')
                expect(result.status).toEqual(204)
            }
        })
        it('delete created journals', async () => {
            // fileshare ids are uuids, journals get resource_id 0
            await db.billing.Journal.delete({resource_name: 'fileshare', resource_id: 0, timestamp: MoreThanOrEqual(startedAt)})
            await db.billing.Journal.delete({username: resellerCreds.username, timestamp: MoreThanOrEqual(startedAt)})
            if (otherResellerId) {
                await db.fileshare.Upload.delete({reseller_id: otherResellerId})
                await db.billing.Reseller.delete(otherResellerId)
            }
            if (otherResellerContractId)
                await db.billing.Contract.delete(otherResellerContractId)
        })

        it('delete mock admin', async () => {
            await db.billing.Admin.delete({login: creds.username})
            await db.billing.Admin.delete({login: resellerCreds.username})
        })
    })
})