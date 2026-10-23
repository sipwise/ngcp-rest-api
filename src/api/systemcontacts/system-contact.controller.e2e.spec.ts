import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'

import {SystemContactResponseDto} from './dto/system-contact-response.dto'
import {SystemContactModule} from './system-contact.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {ContactStatus} from '~/entities/internal/contact.internal.entity'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {validate} from '~/helpers/validate.helper'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

type SystemContactPost = {
    firstname?: string
    lastname?: string
    email?: string
    newsletter?: boolean
    status: ContactStatus
}

describe('SystemContact', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    const createdIds: number[] = []
    const creds = {username: 'administrator', password: 'administrator'}

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [SystemContactModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        app = moduleRef.createNestApplication()

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
            const contact1: SystemContactPost = {
                firstname: 'test_sc1_first',
                lastname: 'test_sc1_last',
                email: 'test_sc1@example.com',
                newsletter: false,
                status: ContactStatus.Active,
            }
            const contact2: SystemContactPost = {
                firstname: 'test_sc2_first',
                email: 'test_sc2@example.com',
                newsletter: true,
                status: ContactStatus.Active,
            }
            it('create system contact 1', async () => {
                const response = await request(app.getHttpServer())
                    .post('/systemcontacts')
                    .set(...authHeader)
                    .send(contact1)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body[0].id)
            })
            it('create system contact 2', async () => {
                const response = await request(app.getHttpServer())
                    .post('/systemcontacts')
                    .set(...authHeader)
                    .send(contact2)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body[0].id)
            })
            it('fail create system contact without status', async () => {
                const response = await request(app.getHttpServer())
                    .post('/systemcontacts')
                    .set(...authHeader)
                    .send({email: 'test_sc_nostatus@example.com'})
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read system contacts collection', async () => {
                const response = await request(app.getHttpServer())
                    .get('/systemcontacts?email=test_sc1@example.com')
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const collection = response.body
                expect(collection).toHaveLength(2)
                expect(collection[1]).toEqual(1)
                const contact: SystemContactResponseDto = collection[0][0]
                expect(contact.id).toEqual(createdIds[0])
                expect(contact.firstname).toEqual('test_sc1_first')
            })
            it('read system contact 1', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/systemcontacts/${createdIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const contact: SystemContactResponseDto = response.body
                expect(await validate(contact)).toEqual([])
                expect(contact.firstname).toEqual('test_sc1_first')
                expect(contact.newsletter).toEqual(false)
            })
            it('read system contact 2', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/systemcontacts/${createdIds[1]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const contact: SystemContactResponseDto = response.body
                expect(contact.newsletter).toEqual(true)
            })
            it('read non-existing system contact', async () => {
                const response = await request(app.getHttpServer())
                    .get('/systemcontacts/999911111122')
                    .set(...authHeader)
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            const contact3: SystemContactPost = {
                firstname: 'test_sc3_first',
                email: 'test_sc3@example.com',
                newsletter: true,
                status: ContactStatus.Active,
            }
            it('update system contact 1 -> 3', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/systemcontacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .send(contact3)
                expect(response.status).toEqual(200)
                const contact: SystemContactResponseDto = response.body
                expect(contact.firstname).toEqual('test_sc3_first')
                expect(contact.lastname).toBeNull()
                expect(contact.newsletter).toEqual(true)
            })
            it('update non-existing system contact', async () => {
                const response = await request(app.getHttpServer())
                    .put('/systemcontacts/999911111122')
                    .set(...authHeader)
                    .send(contact3)
                expect(response.status).toEqual(404)
            })
        })

        describe('PATCH', () => {
            const patch: PatchOperation[] = [
                {op: 'replace', path: '/firstname', value: 'test_sc4_first'},
                {op: 'replace', path: '/newsletter', value: false},
            ]
            it('adjust system contact 3 -> 4', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/systemcontacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(200)
                const contact: SystemContactResponseDto = response.body
                expect(contact.firstname).toEqual('test_sc4_first')
                expect(contact.email).toEqual('test_sc3@example.com')
                expect(contact.newsletter).toEqual(false)
            })
            it('adjust system contacts bulk', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/systemcontacts')
                    .set(...authHeader)
                    .send({
                        [createdIds[0]]: [{op: 'replace', path: '/lastname', value: 'test_sc4_last'}],
                        [createdIds[1]]: [{op: 'replace', path: '/lastname', value: 'test_sc2_last'}],
                    })
                expect(response.status).toEqual(200)
                expect(response.body).toEqual(createdIds)
            })
            it('read bulk adjusted system contact', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/systemcontacts/${createdIds[1]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const contact: SystemContactResponseDto = response.body
                expect(contact.lastname).toEqual('test_sc2_last')
                expect(contact.firstname).toEqual('test_sc2_first')
            })
            it('fail adjust system contact with invalid status', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/systemcontacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .send([{op: 'replace', path: '/status', value: 'invalid'}])
                expect(response.status).toEqual(422)
            })
            it('adjust non-existing system contact', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/systemcontacts/999911111122')
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('DELETE', () => {
        it('delete created system contacts', async () => {
            for (const id of createdIds) {
                const response = await request(app.getHttpServer())
                    .delete(`/systemcontacts/${id}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
            }
        })
    })
})
