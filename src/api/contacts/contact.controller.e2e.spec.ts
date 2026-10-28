import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'

import {ContactModule} from './contact.module'
import {ContactResponseDto} from './dto/contact-response.dto'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {ContactStatus} from '~/entities/internal/contact.internal.entity'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {validate} from '~/helpers/validate.helper'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

type ContactPost = {
    reseller_id: number
    firstname?: string
    lastname?: string
    email?: string
    newsletter?: boolean
    status: ContactStatus
}

describe('Contact', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    const createdIds: number[] = []
    const creds = {username: 'administrator', password: 'administrator'}

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [ContactModule, AppModule],
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
            const contact1: ContactPost = {
                reseller_id: 1,
                firstname: 'test_c1_first',
                lastname: 'test_c1_last',
                email: 'test_c1@example.com',
                newsletter: false,
                status: ContactStatus.Active,
            }
            const contact2: ContactPost = {
                reseller_id: 1,
                firstname: 'test_c2_first',
                email: 'test_c2@example.com',
                newsletter: true,
                status: ContactStatus.Active,
            }
            it('create contact 1', async () => {
                const response = await request(app.getHttpServer())
                    .post('/contacts')
                    .set(...authHeader)
                    .send(contact1)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body[0].id)
            })
            it('create contact 2', async () => {
                const response = await request(app.getHttpServer())
                    .post('/contacts')
                    .set(...authHeader)
                    .send(contact2)
                expect(response.status).toEqual(201)
                createdIds.push(+response.body[0].id)
            })
            it('fail create contact with invalid reseller_id', async () => {
                const response = await request(app.getHttpServer())
                    .post('/contacts')
                    .set(...authHeader)
                    .send({...contact1, reseller_id: 999911111122})
                expect(response.status).toEqual(422)
            })
            it('fail create contact without status', async () => {
                const response = await request(app.getHttpServer())
                    .post('/contacts')
                    .set(...authHeader)
                    .send({reseller_id: 1})
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read contacts collection', async () => {
                const response = await request(app.getHttpServer())
                    .get('/contacts?email=test_c1@example.com')
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const collection = response.body
                expect(collection).toHaveLength(2)
                expect(collection[1]).toEqual(1)
                const contact: ContactResponseDto = collection[0][0]
                expect(contact.id).toEqual(createdIds[0])
                expect(contact.firstname).toEqual('test_c1_first')
            })
            it('read contact 1', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/contacts/${createdIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const contact: ContactResponseDto = response.body
                expect(await validate(contact)).toEqual([])
                expect(contact.firstname).toEqual('test_c1_first')
                expect(contact.reseller_id).toEqual(1)
                expect(contact.newsletter).toEqual(false)
            })
            it('read contact 2', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/contacts/${createdIds[1]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const contact: ContactResponseDto = response.body
                expect(contact.newsletter).toEqual(true)
            })
            it('read non-existing contact', async () => {
                const response = await request(app.getHttpServer())
                    .get('/contacts/999911111122')
                    .set(...authHeader)
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            const contact3: ContactPost = {
                reseller_id: 1,
                firstname: 'test_c3_first',
                email: 'test_c3@example.com',
                newsletter: true,
                status: ContactStatus.Active,
            }
            it('update contact 1 -> 3', async () => {
                const response = await request(app.getHttpServer())
                    .put(`/contacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .send(contact3)
                expect(response.status).toEqual(200)
                const contact: ContactResponseDto = response.body
                expect(contact.firstname).toEqual('test_c3_first')
                expect(contact.lastname).toBeNull()
                expect(contact.newsletter).toEqual(true)
            })
            it('update non-existing contact', async () => {
                const response = await request(app.getHttpServer())
                    .put('/contacts/999911111122')
                    .set(...authHeader)
                    .send(contact3)
                expect(response.status).toEqual(404)
            })
        })

        describe('PATCH', () => {
            const patch: PatchOperation[] = [
                {op: 'replace', path: '/firstname', value: 'test_c4_first'},
                {op: 'replace', path: '/newsletter', value: false},
            ]
            it('adjust contact 3 -> 4', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/contacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(200)
                const contact: ContactResponseDto = response.body
                expect(contact.firstname).toEqual('test_c4_first')
                expect(contact.email).toEqual('test_c3@example.com')
                expect(contact.newsletter).toEqual(false)
            })
            it('adjust contacts bulk', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/contacts')
                    .set(...authHeader)
                    .send({
                        [createdIds[0]]: [{op: 'replace', path: '/lastname', value: 'test_c4_last'}],
                        [createdIds[1]]: [{op: 'replace', path: '/lastname', value: 'test_c2_last'}],
                    })
                expect(response.status).toEqual(200)
                expect(response.body).toEqual(createdIds)
            })
            it('read bulk adjusted contact', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/contacts/${createdIds[1]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const contact: ContactResponseDto = response.body
                expect(contact.lastname).toEqual('test_c2_last')
                expect(contact.firstname).toEqual('test_c2_first')
            })
            it('fail adjust contact with invalid status', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/contacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .send([{op: 'replace', path: '/status', value: 'invalid'}])
                expect(response.status).toEqual(422)
            })
            it('adjust non-existing contact', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/contacts/999911111122')
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('Contact field types', () => {
        it('read timestamps', async () => {
            const response = await request(app.getHttpServer())
                .get(`/contacts/${createdIds[0]}`)
                .set(...authHeader)
            expect(response.status).toEqual(200)
            expect(new Date(response.body.create_timestamp).getTime()).not.toBeNaN()
            expect(new Date(response.body.modify_timestamp).getTime()).not.toBeNaN()
            expect(response.body.create_timestamp).not.toMatch(/^\d{4}-\d{2}-\d{2}$/)
            expect(response.body.terminate_timestamp).toBeNull()
        })
        it('fail create with invalid field types', async () => {
            const tt = [
                {gender: 'unknown'},
                {newsletter: 'yes'},
                {country: 'Germany'},
                {postcode: '12345678901234567'},
                {firstname: 'x'.repeat(128)},
                {email: 123},
            ]
            for (const fields of tt) {
                const response = await request(app.getHttpServer())
                    .post('/contacts')
                    .set(...authHeader)
                    .send({...{reseller_id: 1, status: 'active'}, ...fields})
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.message)).toContain(Object.keys(fields)[0])
            }
        })
        it('fail adjust with invalid field types', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/contacts/${createdIds[0]}`)
                .set(...authHeader)
                .send([{op: 'replace', path: '/gender', value: 'unknown'}])
            expect(response.status).toEqual(422)
        })
        it('fail adjust with empty status', async () => {
            const tt: PatchOperation[][] = [
                [{op: 'replace', path: '/status', value: null}],
                [{op: 'remove', path: '/status'}],
            ]
            for (const emptyPatch of tt) {
                const response = await request(app.getHttpServer())
                    .patch(`/contacts/${createdIds[0]}`)
                    .set(...authHeader)
                    .send(emptyPatch)
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.message)).toContain('status should not be empty')
            }
        })
        it('clear fields with adjust', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/contacts/${createdIds[0]}`)
                .set(...authHeader)
                .send([
                    {op: 'replace', path: '/gender', value: 'female'},
                    {op: 'replace', path: '/country', value: 'AT'},
                ])
            expect(response.status).toEqual(200)
            expect(response.body.gender).toEqual('female')
            expect(response.body.country).toEqual('AT')
            const cleared = await request(app.getHttpServer())
                .patch(`/contacts/${createdIds[0]}`)
                .set(...authHeader)
                .send([
                    {op: 'remove', path: '/gender'},
                    {op: 'replace', path: '/country', value: null},
                    {op: 'replace', path: '/newsletter', value: null},
                ])
            expect(cleared.status).toEqual(200)
            expect(cleared.body.gender).toBeNull()
            expect(cleared.body.country).toBeNull()
            expect(cleared.body.newsletter).toEqual(false)
            expect(cleared.body.create_timestamp).toEqual(response.body.create_timestamp)
        })
        it('fail changing a customer contact to a system contact', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/contacts/${createdIds[0]}`)
                .set(...authHeader)
                .send([{op: 'replace', path: '/reseller_id', value: null}])
            expect(response.status).toEqual(422)
            expect(JSON.stringify(response.body)).toContain('can not be changed between a system contact')
        })
        it('ignore timestamps in adjust', async () => {
            const before = await request(app.getHttpServer())
                .get(`/contacts/${createdIds[0]}`)
                .set(...authHeader)
            const response = await request(app.getHttpServer())
                .patch(`/contacts/${createdIds[0]}`)
                .set(...authHeader)
                .send([{op: 'replace', path: '/terminate_timestamp', value: '2000-01-01 00:00:00'}])
            expect(response.status).toEqual(200)
            expect(response.body.terminate_timestamp).toBeNull()
            expect(response.body.create_timestamp).toEqual(before.body.create_timestamp)
        })
    })

    describe('DELETE', () => {
        it('delete created contacts', async () => {
            for (const id of createdIds) {
                const response = await request(app.getHttpServer())
                    .delete(`/contacts/${id}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
            }
        })
    })
})
