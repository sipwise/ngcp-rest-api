import path from 'path'

import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'

import {FileshareModule} from './fileshare.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

describe('Fileshare', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    let createdIds: number[] = []
    const creds = {username: 'administrator', password: 'administrator'}

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [FileshareModule, AppModule],
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
            const fileshare: any = {
                file: 'testfile.txt',
                ttl: 3600,
            }
            it('creates file', async () => {
                const response = await request(app.getHttpServer())
                    .post('/fileshare')
                    .set(...authHeader)
                    .attach('file', path.resolve(__dirname, './fixtures/fileshare-test-file.txt'))
                    .field('ttl', fileshare.ttl)
                expect(response.status).toEqual(201)
                createdIds.push(response.body.id)
            })
            it('does not create file without file', async () => {
                const response = await request(app.getHttpServer())
                    .post('/fileshare')
                    .set(...authHeader)
                    .field('ttl', fileshare.ttl)
                expect(response.status).toEqual(422)
            })
        })
        describe('GET', () => {
            it('fetches all fileshares', async () => {
                const response = await request(app.getHttpServer())
                    .get('/fileshare')
                    .set(...authHeader)
                expect(response.status).toEqual(200)
            })
        },
        )},
    )
    describe('Fileshare DELETE', () => {
        it('delete created files', async () => {
            for (const id of createdIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/fileshare/${id}`)
                    .set(...authHeader)
                expect(result.status).toEqual(200)
            }
        })
    })
})