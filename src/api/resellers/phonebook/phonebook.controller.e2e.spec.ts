import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'

import {ResellerPhonebookResponseDto} from './dto/phonebook-response.dto'
import {ResellerPhonebookModule} from './phonebook.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {ResponseValidationInterceptor} from '~/interceptors/response-validation.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'

type PhonebookPost = {
    name: string
    number: string
    reseller_id?: number
}

describe('Reseller Phonebook', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    const createdPhonebookIds: number[] = []
    let resellerAdminId: number
    const creds = {username: 'administrator', password: 'administrator'}
    const resellerCreds = {username: 'pb_reseller', password: 'FFFooobarbaz123!!!'}

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [ResellerPhonebookModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        app = moduleRef.createNestApplication()

        // TODO import other app configuration from bootstrap()
        // like interceptors, etc.
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
            it('create phonebook bulk with purge_existing', async () => {
                // test this first so it doesnt affect other tests via purge
                const purgeTest = await db.billing.ResellerPhonebook.create({
                    reseller_id: 1,
                    name: 'test',
                    number: '123',
                }).save()
                createdPhonebookIds.push(purgeTest.id)

                const csvContent = [
                    'reseller_id,name,number',
                    '1,RES_PHONEBOOK_TEST,999998',
                    '1,RES_PHONEBOOK_TEST_2,999999',
                ].join('\n')
                const response = await request(app.getHttpServer())
                    .post('/resellers/phonebook?purge_existing=true')
                    .set(...authHeader)
                    .attach('file', Buffer.from(csvContent), 'reseller_phonebook_test.csv')
                expect(response.status).toEqual(201)
                createdPhonebookIds.pop()
                createdPhonebookIds.push(+response.body[0].id)
                createdPhonebookIds.push(+response.body[1].id)

                const cnt = await db.billing.ResellerPhonebook.count({where: {reseller_id: 1}})
                expect(cnt).toEqual(2)
            })
            it('create phonebook', async () => {
                const phonebook1: PhonebookPost = {
                    name: 'test_phonebook1',
                    number: '123',
                    reseller_id: 1,
                }
                const response = await request(app.getHttpServer())
                    .post('/resellers/phonebook')
                    .set(...authHeader)
                    .send(phonebook1)
                expect(response.status).toEqual(201)
                createdPhonebookIds.push(+response.body[0].id)
            })
            it('creates phonebook bulk from csv', async () => {
                const csvContent = [
                    'reseller_id,name,number',
                    '1,RES_PHONEBOOK_TEST_3,30003',
                    '1,RES_PHONEBOOK_TEST_4,30004',
                ].join('\n')
                const response = await request(app.getHttpServer())
                    .post('/resellers/phonebook')
                    .set(...authHeader)
                    .attach('file', Buffer.from(csvContent), 'reseller_phonebook_test.csv')
                expect(response.status).toEqual(201)
                createdPhonebookIds.push(+response.body[0].id)
                createdPhonebookIds.push(+response.body[1].id)
            })
            it('fails to create phonebook bulk because duplicate', async () => {
                const csvContent = [
                    'reseller_id,name,number',
                    '1,RES_PHONEBOOK_TEST_3,30003',
                    '1,RES_PHONEBOOK_TEST_4,30004',
                ].join('\n')
                const response = await request(app.getHttpServer())
                    .post('/resellers/phonebook')
                    .set(...authHeader)
                    .attach('file', Buffer.from(csvContent), 'reseller_phonebook_test.csv')
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read created phonebook', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/resellers/phonebook/${createdPhonebookIds[2]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const phonebook: ResellerPhonebookResponseDto = response.body
                expect(phonebook.name).toEqual('test_phonebook1')
                expect(phonebook.number).toEqual('123')
                expect(phonebook.reseller_id).toEqual(1)
            })
            it('read created phonebook from csv', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/resellers/phonebook/${createdPhonebookIds[3]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const phonebook: ResellerPhonebookResponseDto = response.body
                expect(phonebook.name).toEqual('RES_PHONEBOOK_TEST_3')
            })
            it('read non-existing phonebook', async () => {
                const response = await request(app.getHttpServer())
                    .get('/resellers/phonebook/999911111122')
                    .set(...authHeader)
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            it('update phonebook test_phonebook1 > test_phonebook_foo', async () => {
                const phonebookfoo: PhonebookPost = {
                    name: 'test_phonebook_foo',
                    number: '123',
                    reseller_id: 1,
                }
                const response = await request(app.getHttpServer())
                    .put(`/resellers/phonebook/${createdPhonebookIds[2]}`)
                    .set(...authHeader)
                    .send (phonebookfoo)
                expect(response.status).toEqual(200)
            })
            it('read updated phonebook', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/resellers/phonebook/${createdPhonebookIds[2]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const phonebookset: ResellerPhonebookResponseDto = response.body
                expect(phonebookset.name).toEqual('test_phonebook_foo')
            })
            it('update non-existing phonebook', async () => {
                const phonebookfoo: PhonebookPost = {
                    name: 'test_phonebook_foo_bar',
                    number: '1234',
                    reseller_id: 1,
                }
                const response = await request(app.getHttpServer())
                    .put('/resellers/phonebook/999911111122')
                    .set(...authHeader)
                    .send (phonebookfoo)
                expect(response.status).toEqual(404)
            })
        })

        describe('PATCH', () => {
            const patch: PatchOperation[] = [
                {
                    op: 'replace',
                    path: '/name',
                    value: 'test_phonebook_foobar',
                },
                {
                    op: 'replace',
                    path: '/number',
                    value: '999',
                },
            ]
            it('adjust phonebook', async () => {
                const response = await request(app.getHttpServer())
                    .patch(`/resellers/phonebook/${createdPhonebookIds[0]}`)
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(200)
            })
            it('read updated phonebook  5', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/resellers/phonebook/${createdPhonebookIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const phonebookset: ResellerPhonebookResponseDto = response.body
                expect(phonebookset.name).toEqual('test_phonebook_foobar')
                expect(phonebookset.number).toEqual('999')
            })
            it('adjust non-existing phonebook', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/resellers/phonebook/999911111122')
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('Reseller Phonebook reseller_id as admin', () => {
        it('fail create without reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .post('/resellers/phonebook')
                .set(...authHeader)
                .send({
                    name: 'test_phonebook_no_reseller',
                    number: '8881',
                })
            expect(response.status).toEqual(422)
            expect(JSON.stringify(response.body.message)).toContain('reseller_id should not be empty')
        })
        it('fail update without reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .put(`/resellers/phonebook/${createdPhonebookIds[0]}`)
                .set(...authHeader)
                .send({
                    name: 'test_phonebook_no_reseller',
                    number: '8881',
                })
            expect(response.status).toEqual(422)
            expect(JSON.stringify(response.body.message)).toContain('reseller_id should not be empty')
        })
        it('fail adjust with empty reseller_id', async () => {
            const tt: PatchOperation[][] = [
                [{op: 'replace', path: '/reseller_id', value: null}],
                [{op: 'remove', path: '/reseller_id'}],
            ]
            for (const emptyPatch of tt) {
                const response = await request(app.getHttpServer())
                    .patch(`/resellers/phonebook/${createdPhonebookIds[0]}`)
                    .set(...authHeader)
                    .send(emptyPatch)
                expect(response.status).toEqual(422)
                expect(JSON.stringify(response.body.message)).toContain('reseller_id should not be empty')
            }
        })
        it('fail bulk adjust with empty reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .patch('/resellers/phonebook')
                .set(...authHeader)
                .send({
                    [createdPhonebookIds[0]]: [{op: 'replace', path: '/name', value: 'bulk'}],
                    [createdPhonebookIds[1]]: [{op: 'replace', path: '/reseller_id', value: null}],
                })
            expect(response.status).toEqual(422)
            expect(JSON.stringify(response.body.message)).toContain(`[${createdPhonebookIds[1]}] reseller_id should not be empty`)
        })
        it('fail csv import without reseller_id', async () => {
            const csvContent = [
                'name,number',
                'RES_PHONEBOOK_NO_RESELLER,40001',
            ].join('\n')
            const response = await request(app.getHttpServer())
                .post('/resellers/phonebook')
                .set(...authHeader)
                .attach('file', Buffer.from(csvContent), 'reseller_phonebook_test.csv')
            expect(response.status).toEqual(422)
            expect(JSON.stringify(response.body.message)).toContain('[0] reseller_id should not be empty')
        })
    })

    describe('Reseller Phonebook as reseller', () => {
        let resellerEntityId: number
        it('create reseller admin', async () => {
            const response = await request(app.getHttpServer())
                .post('/admins')
                .set(...authHeader)
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
            resellerAdminId = +response.body[0].id
        })
        it('fail create with reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .post('/resellers/phonebook')
                .auth(resellerCreds.username, resellerCreds.password)
                .send({...{
                    name: 'test_phonebook_reseller',
                    number: '8882',
                }, reseller_id: 1})
            expect(response.status).toEqual(422)
            expect(JSON.stringify(response.body.message)).toContain('property reseller_id should not exist')
        })
        it('create without reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .post('/resellers/phonebook')
                .auth(resellerCreds.username, resellerCreds.password)
                .send({
                    name: 'test_phonebook_reseller',
                    number: '8882',
                })
            expect(response.status).toEqual(201)
            resellerEntityId = +response.body[0].id
            createdPhonebookIds.push(resellerEntityId)
        })
        it('read created by reseller', async () => {
            const response = await request(app.getHttpServer())
                .get(`/resellers/phonebook/${resellerEntityId}`)
                .set(...authHeader)
            expect(response.status).toEqual(200)
            expect(response.body.reseller_id).toEqual(1)
        })
        it('fail update with reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .put(`/resellers/phonebook/${resellerEntityId}`)
                .auth(resellerCreds.username, resellerCreds.password)
                .send({...{
                    name: 'renamed_test_phonebook_reseller',
                    number: '8882',
                }, reseller_id: 1})
            expect(response.status).toEqual(422)
            expect(JSON.stringify(response.body.message)).toContain('property reseller_id should not exist')
        })
        it('update without reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .put(`/resellers/phonebook/${resellerEntityId}`)
                .auth(resellerCreds.username, resellerCreds.password)
                .send({
                    name: 'renamed_test_phonebook_reseller',
                    number: '8882',
                })
            expect(response.status).toEqual(200)
        })
        it('read updated by reseller', async () => {
            const response = await request(app.getHttpServer())
                .get(`/resellers/phonebook/${resellerEntityId}`)
                .set(...authHeader)
            expect(response.status).toEqual(200)
            expect(response.body.reseller_id).toEqual(1)
        })
        it('fail patch reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/resellers/phonebook/${resellerEntityId}`)
                .auth(resellerCreds.username, resellerCreds.password)
                .send([{op: 'replace', path: '/reseller_id', value: 1}])
            expect(response.status).toEqual(422)
            expect(JSON.stringify(response.body.message)).toContain('property reseller_id should not exist')
        })
        it('patch without reseller_id', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/resellers/phonebook/${resellerEntityId}`)
                .auth(resellerCreds.username, resellerCreds.password)
                .send([{op: 'replace', path: '/name', value: 'patched reseller'}])
            expect(response.status).toEqual(200)
            expect(response.body.name).toEqual('patched reseller')
        })
        it('read patched by reseller', async () => {
            const response = await request(app.getHttpServer())
                .get(`/resellers/phonebook/${resellerEntityId}`)
                .set(...authHeader)
            expect(response.status).toEqual(200)
            expect(response.body.reseller_id).toEqual(1)
        })
        it('fail csv import with reseller_id', async () => {
            const csvContent = [
                'reseller_id,name,number',
                '1,RES_PHONEBOOK_RESELLER_1,40002',
            ].join('\n')
            const response = await request(app.getHttpServer())
                .post('/resellers/phonebook')
                .auth(resellerCreds.username, resellerCreds.password)
                .attach('file', Buffer.from(csvContent), 'reseller_phonebook_test.csv')
            expect(response.status).toEqual(422)
            expect(JSON.stringify(response.body.message)).toContain('[0] property reseller_id should not exist')
        })
        it('csv import without reseller_id', async () => {
            const tt = [
                ['name,number', 'RES_PHONEBOOK_RESELLER_2,40003'],
                ['reseller_id,name,number', ',RES_PHONEBOOK_RESELLER_3,40004'],
            ]
            for (const rows of tt) {
                const response = await request(app.getHttpServer())
                    .post('/resellers/phonebook')
                    .auth(resellerCreds.username, resellerCreds.password)
                    .attach('file', Buffer.from(rows.join('\n')), 'reseller_phonebook_test.csv')
                expect(response.status).toEqual(201)
                expect(response.body[0].reseller_id).toEqual(1)
                createdPhonebookIds.push(+response.body[0].id)
            }
        })
        it('delete reseller admin', async () => {
            const response = await request(app.getHttpServer())
                .delete(`/admins/${resellerAdminId}`)
                .set(...authHeader)
            expect(response.status).toEqual(200)
        })
    })

    describe('phonebook DELETE', () => {
        it('delete created phonebook', async () => {
            for (const id of createdPhonebookIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/resellers/phonebook/${id}`)
                    .set(...authHeader)
                expect(result.status).toEqual(200)
            }
        })
    })
})
