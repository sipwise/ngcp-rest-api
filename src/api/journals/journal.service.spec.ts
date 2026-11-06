import {Test, TestingModule} from '@nestjs/testing'
import {Request} from 'express'

import {JournalModule} from './journal.module'
import {JournalService} from './journal.service'
import {JournalMariadbRepository} from './repositories/journal.mariadb.repository'
import {JournalMockRepository} from './repositories/journal.mock.repository'

import {AppModule} from '~/app.module'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {internal} from '~/entities'
import Context from '~/helpers/context.helper'
import {ExpandModule} from '~/helpers/expand.module'
import {ServiceRequest} from '~/interfaces/service-request.interface'

const user: AuthResponseDto = {
    readOnly: false,
    showPasswords: true,
    active: true,
    id: 1,
    is_master: true,
    reseller_id: 2,
    reseller_id_required: false,
    role: 'system',
    username: 'administrator',
}

describe('JournalService', () => {
    let service: JournalService
    let journalMockRepo: JournalMockRepository

    let sr: ServiceRequest

    const makeReq = (method: string, routePath = '/api/customers/phonebook/:id'): Request => {
        const req = {method, path: routePath, route: {path: routePath}} as unknown as Request
        Context.bind(req)
        return req
    }

    const lastJournal = async (): Promise<internal.Journal> => {
        const [all] = await journalMockRepo.readAll(sr)
        return all[all.length - 1]
    }

    afterEach(() => {
        jest.restoreAllMocks()
    })

    beforeEach(async () => {
        journalMockRepo = new JournalMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [JournalModule, ExpandModule, AppModule],
        })
            .overrideProvider(JournalMariadbRepository).useValue(journalMockRepo)
            .compile()

        service = module.get<JournalService>(JournalService)
        sr = {headers: {} as never, params: undefined, query: undefined, user: user, req: undefined, returnContent: undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(journalMockRepo).toBeDefined()
    })

    describe('readAll', () => {
        it('should return an array of customer contacts', async () => {
            const got = await service.readAll(sr)
            expect(got).toStrictEqual(await journalMockRepo.readAll(sr))
        })
    })

    describe('readAll filters', () => {
        it('passes resource name and id to the repository', async () => {
            const spy = jest.spyOn(journalMockRepo, 'readAll')
            await service.readAll(sr, 'customers/phonebook', 5)
            expect(spy).toHaveBeenCalledWith(sr, 'customers/phonebook', 5)
        })

        it('returns only the matching journals', async () => {
            sr.req = makeReq('POST')
            await service.writeJournal(sr, 5, {a: 1})
            await service.writeJournal(sr, 6, {a: 1})
            const [journals, count] = await service.readAll(sr, 'customers/phonebook', 5)
            expect(count).toEqual(1)
            expect(journals[0].resource_id).toEqual(5)
        })
    })

    describe('create', () => {
        it('stores the journal and returns it', async () => {
            const journal = internal.Journal.create({
                content_format: 'json', operation: 'create', reseller_id: 1, resource_id: 1, resource_name: 'x',
                role: 'admin', role_id: 1, timestamp: 1, tx_id: 'tx', user_id: 1, username: 'u',
            })
            const got = await service.create(journal, sr)
            expect(got.id).toBeDefined()
            expect(got.resource_name).toEqual('x')
        })
    })

    describe('resourceName', () => {
        it('strips prefix, parameters and trailing journal from the route', () => {
            sr.req = makeReq('GET', '/api/customers/:customerId/phonebook/:id/journal')
            expect(service.resourceName(sr)).toEqual('customers/phonebook')
        })

        it('falls back to the request path without a route', () => {
            sr.req = {method: 'GET', path: '/api/domains'} as unknown as Request
            expect(service.resourceName(sr)).toEqual('domains')
        })
    })

    describe('writeJournal', () => {
        it.each([['POST', 'create'], ['PUT', 'update'], ['PATCH', 'update'], ['DELETE', 'delete']])(
            'maps %s to %s', async (method, op) => {
                sr.req = makeReq(method)
                await expect(service.writeJournal(sr, 3, {a: 1})).resolves.toBe(true)
                const j = await lastJournal()
                expect(j.operation).toEqual(op)
                expect(j.resource_id).toEqual(3)
                expect(j.resource_name).toEqual('customers/phonebook')
                expect(j.content_format).toEqual('json')
            })

        it.each(['GET', 'HEAD', 'OPTIONS'])('skips %s without writing', async (method) => {
            sr.req = makeReq(method)
            const spy = jest.spyOn(journalMockRepo, 'create')
            await expect(service.writeJournal(sr, 3, {a: 1})).resolves.toBe(false)
            expect(spy).not.toHaveBeenCalled()
        })

        it('records user data, transaction id and timestamp in seconds', async () => {
            sr.req = makeReq('POST')
            sr.user = {...user, id: 7, reseller_id: 4, role: 'reseller', username: 'res', role_data: {id: 9} as internal.AclRole}
            await service.writeJournal(sr, 1, {a: 1})
            const j = await lastJournal()
            const ctx = Context.get(sr.req)
            expect(j).toMatchObject({user_id: 7, reseller_id: 4, role: 'reseller', username: 'res', role_id: 9, tx_id: ctx.txid})
            expect(j.timestamp).toEqual(ctx.startTime / 1000)
        })

        it('uses a null role_id without role_data', async () => {
            sr.req = makeReq('POST')
            await service.writeJournal(sr, 1, {a: 1})
            expect((await lastJournal()).role_id).toBeNull()
        })

        it('serialises objects and arrays as json', async () => {
            sr.req = makeReq('PUT')
            await service.writeJournal(sr, 1, {a: 1, b: [2]})
            expect((await lastJournal()).content).toEqual('{"a":1,"b":[2]}')
            await service.writeJournal(sr, 1, [{a: 1}])
            expect((await lastJournal()).content).toEqual('[{"a":1}]')
        })

        it('obfuscates passwords in the content', async () => {
            sr.req = makeReq('POST')
            await service.writeJournal(sr, 1, {login: 'x', password: 'secret', webpassword: 'secret2'})
            const content = (await lastJournal()).content
            expect(String(content)).not.toContain('secret')
            expect(JSON.parse(String(content)).login).toEqual('x')
        })

        it('writes empty content for empty objects and arrays', async () => {
            sr.req = makeReq('DELETE')
            await service.writeJournal(sr, 1, {})
            expect((await lastJournal()).content).toEqual('')
            await service.writeJournal(sr, 1, [])
            expect((await lastJournal()).content).toEqual('')
        })

        it('base64 encodes string content', async () => {
            sr.req = makeReq('POST')
            await service.writeJournal(sr, 1, 'abc')
            expect((await lastJournal()).content).toEqual(Buffer.from('abc').toString('base64'))
        })

        it('defaults the content format to json and sets the credentials header', async () => {
            sr.req = makeReq('POST')
            sr.headers['content-type'] = 'text/plain'
            await service.writeJournal(sr, 1, {a: 1})
            expect((await lastJournal()).content_format).toEqual('json')
            expect(sr.headers['access-control-allow-credentials']).toEqual('true')
        })
    })
})
