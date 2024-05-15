import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'
import {AppModule} from '../../app.module'
import {AppService} from '../../app.service'
import {AuthService} from '../../auth/auth.service'
import {HttpExceptionFilter} from '../../helpers/http-exception.filter'
import {ValidateInputPipe} from '../../pipes/validate.pipe'
import {validate} from 'class-validator'
import {PbxModule} from './pbx.module'
import {PbxResponseDto} from './dto/pbx-response.dto'
import {LicenseMockRepository} from '../../repositories/license.mock.repository'
import {LicenseRepository} from '../../repositories/license.repository'
import {License as LicenseType} from '../../config/constants.config'

describe('', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    const licenseMockRepo = new LicenseMockRepository()
    let authHeader: [string, string]
    const creds = {username: 'administrator', password: 'administrator'}

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [PbxModule, AppModule],
        })
            .overrideProvider(LicenseRepository).useValue(licenseMockRepo)
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        app = moduleRef.createNestApplication()

        // TODO import other app configuration from bootstrap()
        // like interceptors, etc.
        app.useGlobalPipes(new ValidateInputPipe())
        app.useGlobalFilters(new HttpExceptionFilter())

        await app.init()
    })

    afterEach(async () => {
        licenseMockRepo.reset()
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
        describe('GET', () => {
            it('read pbx if pbx license is active', async () => {
                const response = await request(app.getHttpServer())
                    .get('/pbx')
                    .set(...authHeader)
                expect(response.status).toEqual(200)
            })
            it('does not read pbx if pbx license is inactive', async () => {
                licenseMockRepo.setLicense(LicenseType.pbx, 0)
                const response = await request(app.getHttpServer())
                    .get('/pbx')
                    .set(...authHeader)
                expect(response.status).toEqual(403)
            })
            it('read pbx', async () => {
                const response = await request(app.getHttpServer())
                    .get('/pbx')
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const setCollection: PbxResponseDto = response.body
                expect(await validate(setCollection)).toEqual([])
            })
        })
    })
})