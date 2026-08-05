import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'
import {v4 as uuidv4} from 'uuid'

import {SubscriberPhonebookResponseDto} from './dto/subscriber-phonebook-response.dto'
import {SubscriberPhonebookModule} from './subscriber-phonebook.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {db} from '~/entities'
import {VoipSubscriber as BillingVoipSubscriber} from '~/entities/db/billing/voip-subscriber.mariadb.entity'
import {HttpExceptionFilter} from '~/helpers/http-exception.filter'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {ResponseValidationInterceptor} from '~/interceptors/validate.interceptor'
import {ValidateInputPipe} from '~/pipes/validate.pipe'


type PhonebookPost = {
    name: string
    number: string
    subscriber_id: number
    shared: boolean
}

describe('Subscriber Phonebook', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    let authHeader: [string, string]
    const createdPhonebookIds: number[] = []
    const createdSubscriberIds: number[] = []
    const createdContractIds: number[] = []
    const createdDomainIds: number[] = []
    const creds = {username: 'administrator', password: 'administrator'}

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [SubscriberPhonebookModule, AppModule],
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
                const contract = await db.billing.Contract.create({
                    product_id: 2,
                }).save()
                createdContractIds.push(contract.id)
                const domain = await db.billing.Domain.create({
                    domain: 'sub_pb_test_dom1',
                    reseller_id: 1,
                }).save()
                createdDomainIds.push(domain.id)
                const insertResult = await BillingVoipSubscriber.insert({ // insert instead of create to avoid a cyclic dependency error
                    contract_id: contract.id,
                    uuid: uuidv4(),
                    username: 'sub_pb_test1',
                    domain_id: domain.id,
                    status: 'active',
                })
                const subscriber = insertResult.identifiers[0]
                createdSubscriberIds.push(subscriber.id)

                // test this first so it doesnt affect other tests via purge
                const purgeTest = await db.billing.SubscriberPhonebook.create({
                    subscriber_id: subscriber.id,
                    name: 'test',
                    number: '123',
                }).save()
                createdPhonebookIds.push(purgeTest.id)

                const csvContent = [
                    'subscriber_id,name,number,shared',
                    `${subscriber.id},SUB_PHONEBOOK_TEST1,999999,1`,
                    `${subscriber.id},SUB_PHONEBOOK_TEST2,989832,0`,
                ].join('\n')

                const response = await request(app.getHttpServer())
                    .post('/subscribers/phonebook?purge_existing=true')
                    .set(...authHeader)
                    .attach('file', Buffer.from(csvContent), 'subscriber_phonebook_test.csv')
                expect(response.status).toEqual(201)
                createdPhonebookIds.pop()
                createdPhonebookIds.push(+response.body[0].id)
                createdPhonebookIds.push(+response.body[1].id)

                const cnt = await db.billing.SubscriberPhonebook.count({where: {subscriber_id: subscriber.id}})
                expect(cnt).toEqual(2)
            })
            it('create phonebook', async () => {
                const phonebook1: PhonebookPost = {
                    name: 'test_phonebook1',
                    number: '123',
                    subscriber_id: createdSubscriberIds[0],
                    shared: false,
                }
                const response = await request(app.getHttpServer())
                    .post('/subscribers/phonebook')
                    .set(...authHeader)
                    .send(phonebook1)
                expect(response.status).toEqual(201)
                createdPhonebookIds.push(+response.body[0].id)
            })
            it('creates phonebook bulk from csv', async () => {
                const csvContent = [
                    'subscriber_id,name,number,shared',
                    `${createdSubscriberIds[0]},SUB_PHONEBOOK_TEST3,10003,1`,
                    `${createdSubscriberIds[0]},SUB_PHONEBOOK_TEST4,10004,0`,
                ].join('\n')
                const response = await request(app.getHttpServer())
                    .post('/subscribers/phonebook')
                    .set(...authHeader)
                    .attach('file', Buffer.from(csvContent), 'subscriber_phonebook_test.csv')
                expect(response.status).toEqual(201)
                createdPhonebookIds.push(+response.body[0].id)
                createdPhonebookIds.push(+response.body[1].id)
            })
            it('fails to create phonebook bulk because duplicate', async () => {
                const csvContent = [
                    'subscriber_id,name,number,shared',
                    `${createdSubscriberIds[0]},SUB_PHONEBOOK_TEST3,10003,1`,
                    `${createdSubscriberIds[0]},SUB_PHONEBOOK_TEST4,10004,0`,
                ].join('\n')
                const response = await request(app.getHttpServer())
                    .post('/subscribers/phonebook')
                    .set(...authHeader)
                    .attach('file', Buffer.from(csvContent), 'subscriber_phonebook_test.csv')
                expect(response.status).toEqual(422)
            })
        })

        describe('GET', () => {
            it('read created phonebook', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/subscribers/phonebook/${createdPhonebookIds[2]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const phonebook: SubscriberPhonebookResponseDto = response.body
                expect(phonebook.name).toEqual('test_phonebook1')
                expect(phonebook.number).toEqual('123')
                expect(phonebook.subscriber_id).toEqual(createdSubscriberIds[0])
            })
            it('read created phonebook from csv', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/subscribers/phonebook/${createdPhonebookIds[3]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const phonebook: SubscriberPhonebookResponseDto = response.body
                expect(phonebook.name).toEqual('SUB_PHONEBOOK_TEST3')
            })
            it('read non-existing phonebook', async () => {
                const response = await request(app.getHttpServer())
                    .get('/subscribers/phonebook/999911111122')
                    .set(...authHeader)
                expect(response.status).toEqual(404)
            })
        })

        describe('PUT', () => {
            it('update phonebook test_phonebook1 > test_phonebook_foo', async () => {
                const phonebookfoo: PhonebookPost = {
                    name: 'test_phonebook_foo',
                    number: '123',
                    subscriber_id: createdSubscriberIds[0],
                    shared: true,
                }
                const response = await request(app.getHttpServer())
                    .put(`/subscribers/phonebook/${createdPhonebookIds[2]}`)
                    .set(...authHeader)
                    .send (phonebookfoo)
                expect(response.status).toEqual(200)
            })
            it('read updated phonebook', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/subscribers/phonebook/${createdPhonebookIds[2]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const phonebookset: SubscriberPhonebookResponseDto = response.body
                expect(phonebookset.name).toEqual('test_phonebook_foo')
            })
            it('update non-existing phonebook', async () => {
                const phonebookfoo: PhonebookPost = {
                    name: 'test_phonebook_foo_bar',
                    number: '1234',
                    subscriber_id: createdSubscriberIds[0],
                    shared: true,
                }
                const response = await request(app.getHttpServer())
                    .put('/subscribers/phonebook/999911111122')
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
                    .patch(`/subscribers/phonebook/${createdPhonebookIds[0]}`)
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(200)
            })
            it('read updated phonebook  5', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/subscribers/phonebook/${createdPhonebookIds[0]}`)
                    .set(...authHeader)
                expect(response.status).toEqual(200)
                const phonebookset: SubscriberPhonebookResponseDto = response.body
                expect(phonebookset.name).toEqual('test_phonebook_foobar')
                expect(phonebookset.number).toEqual('999')
            })
            it('adjust non-existing phonebook', async () => {
                const response = await request(app.getHttpServer())
                    .patch('/subscribers/phonebook/999911111122')
                    .set(...authHeader)
                    .send(patch)
                expect(response.status).toEqual(404)
            })
        })
    })

    describe('phonebook DELETE', () => {
        it('delete created phonebook', async () => {
            for (const id of createdPhonebookIds) {
                const result = await request(app.getHttpServer())
                    .delete(`/subscribers/phonebook/${id}`)
                    .set(...authHeader)
                expect(result.status).toEqual(200)
            }
            if (createdContractIds.length)
                await db.billing.Contract.delete(createdContractIds)
            if (createdDomainIds.length)
                await db.billing.Domain.delete(createdDomainIds)
        })
    })
})
