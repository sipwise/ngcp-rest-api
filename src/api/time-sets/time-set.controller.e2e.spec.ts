import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'
import {In, MoreThanOrEqual} from 'typeorm'
import {v4 as uuidv4} from 'uuid'

import {TimeSetEventModule} from './events/event.module'
import {TimeSetModule} from './time-set.module'

import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {setupApp} from '~/app.setup'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {VoipSubscriber as BillingVoipSubscriber} from '~/entities/db/billing/voip-subscriber.mariadb.entity'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'
import {ErrorEntry} from '~/helpers/errors.helper'
import {Operation as PatchOperation} from '~/helpers/patch.helper'

type EventPost = {
    start: string
    end?: string
    duration?: string
    freq?: string
    interval?: number
    until?: string
    count?: number
    bysecond?: string
    byminute?: string
    byhour?: string
    byday?: string
    bymonthday?: string
    byyearday?: string
    byweekno?: string
    bymonth?: string
    bysetpos?: string
    wkst?: string
    comment?: string
}

type TimeSetPost = {
    name: string
    reseller_id?: number
    events?: EventPost[]
}

type TimeSetBody = {
    id: number
    name: string
    reseller_id: number
    events: {type: string, url: string}
    reseller_id_expand?: {id: number}
}

type EventBody = {
    id: number
    time_set_id: number
    start: string
    end: string | null
    comment: string | null
}

describe('Time Set', () => {
    let app: INestApplication
    let appService: AppService
    let authService: AuthService
    const W = process.env.JEST_WORKER_ID
    const adminCreds = {username: `mockAdminUser${W}`, password: 'mockAdminPass'}
    const resellerCreds = {username: `mockResellerUser${W}`, password: 'mockAdminPass'}
    const ccareCreds = {username: `mockCcareUser${W}`, password: 'mockAdminPass'}
    const linterceptCreds = {username: `mockLinterceptUser${W}`, password: 'mockAdminPass'}
    const startedAt = Date.now() / 1000
    const suffix = `${W}_${Date.now().toString(36)}`
    const headers: {[role: string]: [string, string]} = {}
    const createdSetIds: number[] = []
    const createdLevelIds: number[] = []
    const createdGroupIds: number[] = []
    const createdContractIds: number[] = []
    const resellerIds: number[] = []
    const resellerContractIds: number[] = []
    let resellerA: number
    let resellerB: number

    const subadminDomain = `time-sets-${suffix}.invalid`
    const subscriberNames = {admin: `tsadmin${suffix}`, regular: `tssub${suffix}`}
    let customerContactId: number
    let customerId: number
    let billingDomainId: number
    let provisioningDomainId: number
    const provisioningSubscriberIds: number[] = []

    const as = (role: string, req: request.Test): request.Test => req
        .set(...headers[role])
        .set('Accept', 'application/json')
    const get = (url: string, role = 'admin'): request.Test => as(role, request(app.getHttpServer()).get(url))
    const send = (method: 'post' | 'put' | 'delete', url: string, body: object, role = 'admin'): request.Test =>
        as(role, request(app.getHttpServer())[method](url))
            .set('Content-Type', 'application/json')
            .set('Prefer', method == 'delete' ? 'return=minimal' : 'return=representation')
            .send(body)
    const patch = (url: string, operations: PatchOperation[], role = 'admin'): request.Test =>
        as(role, request(app.getHttpServer()).patch(url))
            .set('Content-Type', 'application/json-patch+json')
            .set('Prefer', 'return=representation')
            .send(operations)
    const pointers = (response: request.Response): string[] =>
        (response.body.errors as ErrorEntry[]).map(e => e.pointer)

    const upload = (method: 'post' | 'put', url: string, text: string, fields: Record<string, string> = {}, options: {role?: string, contentType?: string} = {}): request.Test => {
        const req = as(options.role ?? 'admin', request(app.getHttpServer())[method](url)).set('Prefer', 'return=representation')
        for (const [key, value] of Object.entries(fields))
            req.field(key, value)
        return req.attach('file', Buffer.from(text), {filename: 'time-set.ics', contentType: options.contentType ?? 'text/calendar'})
    }
    const download = (id: number, role = 'admin'): request.Test =>
        request(app.getHttpServer()).get(`/api/time-sets/${id}`).set(...headers[role]).set('Accept', 'text/calendar')
    const calendar = (header: string[], ...events: string[][]): string =>
        ['BEGIN:VCALENDAR', 'VERSION:2.0', ...header, ...events.flatMap(lines => ['BEGIN:VEVENT', ...lines, 'END:VEVENT']), 'END:VCALENDAR', ''].join('\r\n')
    const platformZone = Temporal.Now.timeZoneId()
    const inPlatformZone = (instant: string): string =>
        Temporal.Instant.from(instant).toZonedDateTimeISO(platformZone).toPlainDateTime().toString({smallestUnit: 'second'}).replace('T', ' ')

    const name = (label: string): string => `ts_${label}_${suffix}`
    const dayEvent = (comment: string): EventPost => ({start: '2031-03-03 08:00:00', end: '2031-03-03 17:00:00', comment})

    const createSet = async (post: TimeSetPost, role = 'admin'): Promise<TimeSetBody> => {
        const response = await send('post', '/api/time-sets', post, role)
        expect(response.status).toEqual(201)
        const body = response.body.data[0] as TimeSetBody
        createdSetIds.push(body.id)
        return body
    }
    const eventsOf = async (setId: number): Promise<EventBody[]> => {
        const response = await get(`/api/time-sets/${setId}/events?rows=100`)
        expect(response.status).toEqual(200)
        return response.body.data as EventBody[]
    }

    const insertAdmin = async (login: string, role: RbacRole, resellerId: number, flags: {ccare?: boolean, lintercept?: boolean, superuser?: boolean} = {}): Promise<void> => {
        await db.billing.Admin.delete({login})
        const aclRole = await db.billing.AclRole.findOneByOrFail({role})
        await db.billing.Admin.insert({
            reseller_id: resellerId,
            login,
            saltedpass: 'mockAdminSaltedpass',
            saltedpass_modify_timestamp: new Date(),
            role_id: aclRole.id,
            is_master: true,
            is_superuser: flags.superuser ?? false,
            is_system: false,
            is_ccare: flags.ccare ?? false,
            lawful_intercept: flags.lintercept ?? false,
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
    const createReseller = async (label: string): Promise<number> => {
        const now = new Date()
        const contract = await db.billing.Contract.create({
            contact_id: 2, product_id: 3, status: ContractStatus.Active, create_timestamp: now, modify_timestamp: now,
        }).save()
        resellerContractIds.push(contract.id)
        const reseller = await db.billing.Reseller.create({
            contract_id: contract.id,
            name: `ts_${label}_${suffix}`,
            status: ResellerStatus.Active,
        }).save()
        resellerIds.push(reseller.id)
        return reseller.id
    }
    const login = async (credentials: {username: string, password: string}, role: string): Promise<void> => {
        const response = await request(app.getHttpServer())
            .post('/api/auth/jwt')
            .set('Accept', 'application/json')
            .set('Content-Type', 'application/json')
            .send(credentials)
        expect(response.status).toEqual(201)
        headers[role] = ['Authorization', 'Bearer ' + response.body['access_token']]
    }

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [TimeSetEventModule, TimeSetModule, AppModule],
        })
            .compile()

        appService = moduleRef.get<AppService>(AppService)
        authService = moduleRef.get<AuthService>(AuthService)

        app = moduleRef.createNestApplication()
        app.setGlobalPrefix('api')
        setupApp(app)
        await app.init()

        await insertAdmin(adminCreds.username, RbacRole.admin, 1, {superuser: true})
        resellerA = await createReseller('a')
        resellerB = await createReseller('b')
        await insertAdmin(resellerCreds.username, RbacRole.reseller, resellerA)
        await insertAdmin(ccareCreds.username, RbacRole.ccare, resellerA, {ccare: true})
        await insertAdmin(linterceptCreds.username, RbacRole.lintercept, resellerA, {lintercept: true})
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
        await login(adminCreds, 'admin')
        await login(resellerCreds, 'reseller')
        await login(ccareCreds, 'ccare')
        await login(linterceptCreds, 'lintercept')
    })

    describe('', () => { // main tests block
        describe('POST', () => {
            let setA: TimeSetBody
            let setB: TimeSetBody

            it('creates a time set without events', async () => {
                setA = await createSet({name: name('plain'), reseller_id: resellerA})
                expect(setA.reseller_id).toEqual(resellerA)
                expect(setA.name).toEqual(name('plain'))
                expect(await eventsOf(setA.id)).toEqual([])
            })
            it('creates a time set with embedded events', async () => {
                setB = await createSet({
                    name: name('embedded'),
                    reseller_id: resellerB,
                    events: [dayEvent('one'), dayEvent('two')],
                })
                const events = await eventsOf(setB.id)
                expect(events.map(e => e.comment).sort()).toEqual(['one', 'two'])
                expect(events.every(e => e.time_set_id == setB.id)).toBe(true)
            })
            it('links the events of the time set', () => {
                expect(setB.events.type).toEqual('link')
                expect(setB.events.url).toMatch(new RegExp(`/time-sets/${setB.id}/events$`))
            })
            it('creates many time sets with embedded events', async () => {
                const response = await send('post', '/api/time-sets', [
                    {name: name('bulk1'), reseller_id: resellerA, events: [dayEvent('b1')]},
                    {name: name('bulk2'), reseller_id: resellerB, events: [dayEvent('b2a'), dayEvent('b2b')]},
                ])
                expect(response.status).toEqual(201)
                const bodies = response.body.data as TimeSetBody[]
                expect(bodies.length).toEqual(2)
                createdSetIds.push(...bodies.map(b => b.id))
                expect((await eventsOf(bodies[0].id)).map(e => e.comment)).toEqual(['b1'])
                expect((await eventsOf(bodies[1].id)).length).toEqual(2)
            })
            it('creates a time set with an empty events list', async () => {
                const set = await createSet({name: name('emptyevents'), reseller_id: resellerA, events: []})
                expect(await eventsOf(set.id)).toEqual([])
            })
            it('fails a name used by another time set', async () => {
                const response = await send('post', '/api/time-sets', {name: setA.name, reseller_id: resellerB})
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/name'])
            })
            it('fails a name used by another time set in other case', async () => {
                const response = await send('post', '/api/time-sets', {name: setA.name.toUpperCase(), reseller_id: resellerA})
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/name'])
            })
            it('fails a name repeated within the request', async () => {
                const response = await send('post', '/api/time-sets', [
                    {name: name('dup'), reseller_id: resellerA},
                    {name: name('dup'), reseller_id: resellerA},
                ])
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/1/name'])
            })
            it('fails an unknown reseller', async () => {
                const response = await send('post', '/api/time-sets', {name: name('noreseller'), reseller_id: 999999999})
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/reseller_id'])
            })
            it('fails a missing reseller_id as admin', async () => {
                const response = await send('post', '/api/time-sets', {name: name('missing')})
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/reseller_id'])
            })
            it.each([
                ['a missing name', {reseller_id: 1}, '/name'],
                ['an empty name', {name: '', reseller_id: 1}, '/name'],
                ['a name longer than 90 characters', {name: 'x'.repeat(91), reseller_id: 1}, '/name'],
                ['an invalid embedded event', {name: 'x', reseller_id: 1, events: [{end: '2031-03-03 17:00:00'}]}, '/events/0/start'],
            ])('fails %s', async (_label, body, pointer) => {
                const response = await send('post', '/api/time-sets', body)
                expect(response.status).toEqual(422)
                expect(pointers(response)).toContain(pointer)
            })
            it('rejects an embedded event with a conflicting rule and creates nothing', async () => {
                const response = await send('post', '/api/time-sets', {
                    name: name('badevent'),
                    reseller_id: resellerA,
                    events: [{start: '2031-03-03 08:00:00', end: '2031-03-03 09:00:00', duration: 'PT1H'}],
                })
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/events/0/duration'])
                const listed = await get(`/api/time-sets?name=${name('badevent')}`)
                expect(listed.body.total_count).toEqual(0)
            })
            it('points to an embedded recurrence field without freq', async () => {
                const response = await send('post', '/api/time-sets', {
                    name: name('nofreq'),
                    reseller_id: resellerA,
                    events: [dayEvent('ok'), {...dayEvent('nofreq'), interval: 2}],
                })
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/events/1/interval'])
            })
            it('points to an embedded recurrence field without freq in a bulk request', async () => {
                const response = await send('post', '/api/time-sets', [
                    {name: name('nofreq1'), reseller_id: resellerA, events: [dayEvent('ok')]},
                    {name: name('nofreq2'), reseller_id: resellerA, events: [{...dayEvent('nofreq'), byday: 'MO'}]},
                ])
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/1/events/0/byday'])
            })
        })

        describe('GET', () => {
            it('lists the time sets filtered by name wildcard', async () => {
                const response = await get(`/api/time-sets?name=ts_*_${suffix}&rows=100`)
                expect(response.status).toEqual(200)
                expect((response.body.data as TimeSetBody[]).map(s => s.id).sort()).toEqual([...createdSetIds].sort())
                expect(response.body.total_count).toEqual(createdSetIds.length)
            })
            it('filters by reseller_id', async () => {
                const response = await get(`/api/time-sets?reseller_id=${resellerB}&name=ts_*_${suffix}`)
                expect(response.status).toEqual(200)
                expect((response.body.data as TimeSetBody[]).every(s => s.reseller_id == resellerB)).toBe(true)
                expect(response.body.total_count).toEqual(2)
            })
            it('filters by an id list', async () => {
                const ids = createdSetIds.slice(0, 2)
                const response = await get(`/api/time-sets?id=${ids.join(',')}`)
                expect(response.status).toEqual(200)
                expect((response.body.data as TimeSetBody[]).map(s => s.id).sort()).toEqual([...ids].sort())
            })
            it('reads an item with the link to its events', async () => {
                const id = createdSetIds[1]
                const response = await get(`/api/time-sets/${id}`)
                expect(response.status).toEqual(200)
                expect(response.body.id).toEqual(id)
                expect(response.body.reseller_id).toEqual(resellerB)
                expect(response.body.events.url).toMatch(new RegExp(`/time-sets/${id}/events$`))
            })
            it('returns 404 for an unknown time set', async () => {
                expect((await get('/api/time-sets/999999999')).status).toEqual(404)
            })
        })

        describe('PUT', () => {
            let setId: number
            let oldEventIds: number[]

            it('replaces the events of the time set', async () => {
                setId = (await createSet({name: name('put'), reseller_id: resellerA, events: [dayEvent('old1'), dayEvent('old2')]})).id
                oldEventIds = (await eventsOf(setId)).map(e => e.id)
                const response = await send('put', `/api/time-sets/${setId}`, {
                    name: name('put_renamed'),
                    reseller_id: resellerA,
                    events: [dayEvent('new')],
                })
                expect(response.status).toEqual(200)
                expect(response.body.name).toEqual(name('put_renamed'))
                const events = await eventsOf(setId)
                expect(events.map(e => e.comment)).toEqual(['new'])
                expect(oldEventIds).not.toContain(events[0].id)
            })
            it('does not find the replaced events', async () => {
                for (const id of oldEventIds)
                    expect((await get(`/api/time-sets/events/${id}`)).status).toEqual(404)
            })
            it('removes all events when the request has none', async () => {
                const response = await send('put', `/api/time-sets/${setId}`, {name: name('put_renamed'), reseller_id: resellerA})
                expect(response.status).toEqual(200)
                expect(await eventsOf(setId)).toEqual([])
            })
            it('changes the reseller as admin', async () => {
                const response = await send('put', `/api/time-sets/${setId}`, {name: name('put_renamed'), reseller_id: resellerB})
                expect(response.status).toEqual(200)
                expect(response.body.reseller_id).toEqual(resellerB)
            })
            it('keeps the own name', async () => {
                const response = await send('put', `/api/time-sets/${setId}`, {name: name('put_renamed'), reseller_id: resellerB})
                expect(response.status).toEqual(200)
            })
            it('fails a name of another time set', async () => {
                const response = await send('put', `/api/time-sets/${setId}`, {name: name('plain'), reseller_id: resellerA})
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/name'])
            })
            it('fails an invalid embedded event and keeps the stored events', async () => {
                await send('put', `/api/time-sets/${setId}`, {name: name('put_renamed'), reseller_id: resellerB, events: [dayEvent('keep')]})
                const response = await send('put', `/api/time-sets/${setId}`, {
                    name: name('put_renamed'),
                    reseller_id: resellerB,
                    events: [{start: '2031-03-03 08:00:00', until: '2031-04-03 08:00:00', count: 3, freq: 'daily'}],
                })
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/events/0/count'])
                expect((await eventsOf(setId)).map(e => e.comment)).toEqual(['keep'])
            })
            it('returns 404 for an unknown time set', async () => {
                const response = await send('put', '/api/time-sets/999999999', {name: name('none'), reseller_id: resellerA})
                expect(response.status).toEqual(404)
            })
            it('replaces many time sets', async () => {
                const other = await createSet({name: name('putmany'), reseller_id: resellerA, events: [dayEvent('m-old')]})
                const response = await send('put', '/api/time-sets', {
                    [setId]: {name: name('put_renamed'), reseller_id: resellerB, events: [dayEvent('m1')]},
                    [other.id]: {name: name('putmany'), reseller_id: resellerA},
                })
                expect(response.status).toEqual(200)
                expect((response.body.data as number[]).sort()).toEqual([setId, other.id].sort())
                expect((await eventsOf(setId)).map(e => e.comment)).toEqual(['m1'])
                expect(await eventsOf(other.id)).toEqual([])
            })
            it('points to an embedded recurrence field without freq in a bulk PUT', async () => {
                const response = await send('put', '/api/time-sets', {
                    [setId]: {name: name('put_renamed'), reseller_id: resellerB, events: [{...dayEvent('nofreq'), count: 2}]},
                })
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual([`/${setId}/events/0/count`])
                expect((await eventsOf(setId)).map(e => e.comment)).toEqual(['m1'])
            })
        })

        describe('PATCH', () => {
            let setId: number
            let eventId: number

            it('patches the name and keeps the events', async () => {
                setId = (await createSet({name: name('patch'), reseller_id: resellerA, events: [dayEvent('stay')]})).id
                eventId = (await eventsOf(setId))[0].id
                const response = await patch(`/api/time-sets/${setId}`, [{op: 'replace', path: '/name', value: name('patched')}])
                expect(response.status).toEqual(200)
                expect(response.body.name).toEqual(name('patched'))
                expect((await eventsOf(setId)).map(e => e.id)).toEqual([eventId])
            })
            it('patches the reseller as admin', async () => {
                const response = await patch(`/api/time-sets/${setId}`, [{op: 'replace', path: '/reseller_id', value: resellerB}])
                expect(response.status).toEqual(200)
                expect(response.body.reseller_id).toEqual(resellerB)
            })
            it('fails an unknown reseller', async () => {
                const response = await patch(`/api/time-sets/${setId}`, [{op: 'replace', path: '/reseller_id', value: 999999999}])
                expect(response.status).toEqual(422)
            })
            it('fails removing the reseller', async () => {
                const response = await patch(`/api/time-sets/${setId}`, [{op: 'remove', path: '/reseller_id'}])
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/reseller_id'])
            })
            it('fails a name of another time set', async () => {
                const response = await patch(`/api/time-sets/${setId}`, [{op: 'replace', path: '/name', value: name('plain')}])
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/name'])
            })
            it('patches many time sets', async () => {
                const other = await createSet({name: name('patchmany'), reseller_id: resellerA})
                const bulk = await as('admin', request(app.getHttpServer()).patch('/api/time-sets'))
                    .set('Content-Type', 'application/json-patch+json')
                    .set('Prefer', 'return=representation')
                    .send({
                        [setId]: [{op: 'replace', path: '/name', value: name('patched2')}],
                        [other.id]: [{op: 'replace', path: '/name', value: name('patchmany2')}],
                    })
                expect(bulk.status).toEqual(200)
                expect((await get(`/api/time-sets/${other.id}`)).body.name).toEqual(name('patchmany2'))
                expect((await get(`/api/time-sets/${setId}`)).body.name).toEqual(name('patched2'))
            })
        })

        describe('as reseller', () => {
            let ownId: number
            let foreignId: number
            let foreignEventId: number

            it('creates a time set of the own reseller', async () => {
                const set = await createSet({name: name('own'), events: [dayEvent('own')]}, 'reseller')
                ownId = set.id
                expect(set.reseller_id).toEqual(resellerA)
            })
            it('fails reseller_id in the request', async () => {
                const response = await send('post', '/api/time-sets', {name: name('own2'), reseller_id: resellerA}, 'reseller')
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/reseller_id'])
            })
            it('fails reseller_id in PUT', async () => {
                const response = await send('put', `/api/time-sets/${ownId}`, {name: name('own'), reseller_id: resellerA}, 'reseller')
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/reseller_id'])
            })
            it('fails a PATCH of reseller_id', async () => {
                const response = await patch(`/api/time-sets/${ownId}`, [{op: 'replace', path: '/reseller_id', value: resellerB}], 'reseller')
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/reseller_id'])
            })
            it('keeps the reseller on PUT without reseller_id', async () => {
                const response = await send('put', `/api/time-sets/${ownId}`, {name: name('own'), events: [dayEvent('own put')]}, 'reseller')
                expect(response.status).toEqual(200)
                expect(response.body.reseller_id).toEqual(resellerA)
                expect((await eventsOf(ownId)).map(e => e.comment)).toEqual(['own put'])
            })
            it('patches the name', async () => {
                const response = await patch(`/api/time-sets/${ownId}`, [{op: 'replace', path: '/name', value: name('own_patched')}], 'reseller')
                expect(response.status).toEqual(200)
                expect(response.body.name).toEqual(name('own_patched'))
            })
            it('lists only the own time sets', async () => {
                const response = await get(`/api/time-sets?name=ts_*_${suffix}&rows=100`, 'reseller')
                expect(response.status).toEqual(200)
                const bodies = response.body.data as TimeSetBody[]
                expect(bodies.length).toBeGreaterThan(0)
                expect(bodies.every(s => s.reseller_id == resellerA)).toBe(true)
                expect(bodies.map(s => s.id)).toContain(ownId)
            })
            it('does not find a time set of another reseller', async () => {
                const foreign = await createSet({name: name('foreign'), reseller_id: resellerB, events: [dayEvent('foreign')]})
                foreignId = foreign.id
                foreignEventId = (await eventsOf(foreignId))[0].id
                expect((await get(`/api/time-sets/${foreignId}`, 'reseller')).status).toEqual(404)
                expect((await send('put', `/api/time-sets/${foreignId}`, {name: name('foreign')}, 'reseller')).status).toEqual(404)
                expect((await patch(`/api/time-sets/${foreignId}`, [{op: 'replace', path: '/name', value: 'x'}], 'reseller')).status).toEqual(404)
                expect((await send('delete', `/api/time-sets/${foreignId}`, {}, 'reseller')).status).toEqual(404)
            })
            it('does not find the events of a time set of another reseller', async () => {
                const nested = await get(`/api/time-sets/${foreignId}/events`, 'reseller')
                expect(nested.status).toEqual(200)
                expect(nested.body.total_count).toEqual(0)
                expect((await get(`/api/time-sets/events/${foreignEventId}`, 'reseller')).status).toEqual(404)
                const listed = await get(`/api/time-sets/events?time_set_id=${foreignId}`, 'reseller')
                expect(listed.status).toEqual(200)
                expect(listed.body.total_count).toEqual(0)
            })
            it('deletes an own time set', async () => {
                expect((await send('delete', `/api/time-sets/${ownId}`, {}, 'reseller')).status).toEqual(204)
                createdSetIds.splice(createdSetIds.indexOf(ownId), 1)
                expect((await get(`/api/time-sets/${ownId}`)).status).toEqual(404)
            })
        })

        describe('as ccare, lintercept and subscribers', () => {
            const subscriberHeaders: {[role: string]: (req: request.Test) => request.Test} = {}

            const subscriberAuth = (user: string) => (req: request.Test): request.Test => req
                .auth(`${user}@${subadminDomain}`, 'mockSubscriberWebpassword')
                .set('X-Auth-Realm', 'subscriber')
                .set('Accept', 'application/json')

            it('creates a customer with a subscriberadmin and a subscriber', async () => {
                const now = new Date()
                customerContactId = (await db.billing.Contact.create({
                    reseller_id: resellerA, email: `time_sets_${suffix}@example.org`, create_timestamp: now,
                }).save()).id
                customerId = (await db.billing.Contract.create({
                    contact_id: customerContactId, product_id: 4, status: ContractStatus.Active, create_timestamp: now, modify_timestamp: now,
                }).save()).id
                await appService.db.query('call billing.schedule_contract_billing_profile_network(?,?,?)', [customerId, null, ',,1,,;'])
                billingDomainId = (await db.billing.Domain.create({domain: subadminDomain, reseller_id: resellerA}).save()).id
                provisioningDomainId = (await db.provisioning.VoipDomain.create({domain: subadminDomain}).save()).id
                for (const [kind, username] of Object.entries(subscriberNames)) {
                    const uuid = uuidv4()
                    await BillingVoipSubscriber.insert({ // insert instead of create to avoid a cyclic dependency error
                        contract_id: customerId,
                        uuid,
                        username,
                        domain_id: billingDomainId,
                        status: 'active',
                    })
                    provisioningSubscriberIds.push((await db.provisioning.VoipSubscriber.insert({
                        username,
                        domain_id: provisioningDomainId,
                        uuid,
                        password: uuidv4().slice(0, 16),
                        webusername: username,
                        webpassword: 'mockSubscriberWebpassword',
                        webpassword_modify_timestamp: now,
                        admin: kind == 'admin',
                        account_id: customerId,
                    })).identifiers[0].id)
                    subscriberHeaders[kind] = subscriberAuth(username)
                }
            })

            const calls: [string, string, string, object | undefined][] = [
                ['list sets', 'get', '/api/time-sets', undefined],
                ['read a set', 'get', '/api/time-sets/1', undefined],
                ['create a set', 'post', '/api/time-sets', {name: 'x', reseller_id: 1}],
                ['update a set', 'put', '/api/time-sets/1', {name: 'x', reseller_id: 1}],
                ['patch a set', 'patch', '/api/time-sets/1', [{op: 'replace', path: '/name', value: 'x'}]],
                ['delete a set', 'delete', '/api/time-sets/1', undefined],
                ['list events', 'get', '/api/time-sets/events', undefined],
                ['create an event', 'post', '/api/time-sets/1/events', {start: '2031-03-03 08:00:00'}],
            ]
            const callAs = (login: (req: request.Test) => request.Test, method: string, url: string, body?: object): request.Test => {
                const req = login(request(app.getHttpServer())[method](url))
                return body ? req.set('Content-Type', method == 'patch' ? 'application/json-patch+json' : 'application/json').send(body) : req
            }
            const roleLogins: [string, (req: request.Test) => request.Test][] = [
                ['ccare', (req): request.Test => as('ccare', req)],
                ['lintercept', (req): request.Test => as('lintercept', req)],
                ['subscriberadmin', (req): request.Test => subscriberHeaders['admin'](req)],
                ['subscriber', (req): request.Test => subscriberHeaders['regular'](req)],
            ]
            describe.each(roleLogins)('as %s', (_role, loginAs) => {
                it.each(calls)('fails to %s with 403', async (_label, method, url, body) => {
                    expect((await callAs(loginAs, method, url, body)).status).toEqual(403)
                })
            })
        })

        describe('expand', () => {
            let setId: number
            let levelId: number
            let groupId: number

            it('expands reseller_id of the time sets', async () => {
                setId = (await createSet({name: name('expand'), reseller_id: resellerA, events: [dayEvent('exp')]})).id
                const response = await get(`/api/time-sets?id=${setId}&expand=reseller_id`)
                expect(response.status).toEqual(200)
                expect((response.body.data[0] as TimeSetBody).reseller_id_expand.id).toEqual(resellerA)
            })
            it('expands time_set_id of the events', async () => {
                const response = await get(`/api/time-sets/${setId}/events?expand=time_set_id`)
                expect(response.status).toEqual(200)
                expect(response.body.data[0].time_set_id_expand.id).toEqual(setId)
                expect(response.body.data[0].time_set_id_expand.name).toEqual(name('expand'))
            })
            it('expands time_set_id of an ncos level', async () => {
                const created = await send('post', '/api/ncos/levels', {
                    reseller_id: resellerA,
                    level: name('lvl'),
                    mode: 'blacklist',
                    local_ac: false,
                    intra_pbx: false,
                    expose_to_customer: false,
                    time_set_invert: false,
                    description: 'time set',
                    time_set_id: setId,
                })
                expect(created.status).toEqual(201)
                levelId = +created.body.data[0].id
                createdLevelIds.push(levelId)
                const response = await get(`/api/ncos/levels/${levelId}?expand=time_set_id`)
                expect(response.status).toEqual(200)
                expect(response.body.time_set_id_expand.id).toEqual(setId)
            })
            it('expands time_set_id of a peering group', async () => {
                const contract = await db.billing.Contract.create({product_id: 2}).save()
                createdContractIds.push(contract.id)
                const created = await send('post', '/api/peerings/groups', {
                    name: name('grp'),
                    description: 'time set',
                    contract_id: contract.id,
                    time_set_id: setId,
                })
                expect(created.status).toEqual(201)
                groupId = +created.body.data[0].id
                createdGroupIds.push(groupId)
                const response = await get(`/api/peerings/groups/${groupId}?expand=time_set_id`)
                expect(response.status).toEqual(200)
                expect(response.body.time_set_id_expand.id).toEqual(setId)
            })

            describe('in use', () => {
                it('fails to delete a time set used by an ncos level and a peering group', async () => {
                    const response = await send('delete', `/api/time-sets/${setId}`, {})
                    expect(response.status).toEqual(422)
                    expect(response.body.errorCode).toEqual('TIME_SET_IN_USE')
                    expect(pointers(response)).toEqual([''])
                })
                it('fails a bulk delete naming the used id only', async () => {
                    const free = await createSet({name: name('free'), reseller_id: resellerA})
                    const response = await send('delete', '/api/time-sets', [free.id, setId])
                    expect(response.status).toEqual(422)
                    expect(pointers(response)).toEqual(['/1'])
                    expect((await get(`/api/time-sets/${free.id}`)).status).toEqual(200)
                })
                it('deletes the time set after the ncos level no longer uses it, the peering group still blocks', async () => {
                    expect((await send('delete', `/api/ncos/levels/${levelId}`, {})).status).toEqual(204)
                    createdLevelIds.splice(createdLevelIds.indexOf(levelId), 1)
                    expect((await send('delete', `/api/time-sets/${setId}`, {})).status).toEqual(422)
                })
                it('deletes the time set after the peering group no longer uses it', async () => {
                    expect((await send('delete', `/api/peerings/groups/${groupId}`, {})).status).toEqual(204)
                    createdGroupIds.splice(createdGroupIds.indexOf(groupId), 1)
                    expect((await send('delete', `/api/time-sets/${setId}`, {})).status).toEqual(204)
                    createdSetIds.splice(createdSetIds.indexOf(setId), 1)
                    expect((await get(`/api/time-sets/${setId}`)).status).toEqual(404)
                })
            })
        })

        describe('DELETE', () => {
            it('deletes a time set with its events', async () => {
                const set = await createSet({name: name('del'), reseller_id: resellerA, events: [dayEvent('gone')]})
                const eventIds = (await eventsOf(set.id)).map(e => e.id)
                expect((await send('delete', `/api/time-sets/${set.id}`, {})).status).toEqual(204)
                expect((await get(`/api/time-sets/${set.id}`)).status).toEqual(404)
                for (const id of eventIds)
                    expect((await get(`/api/time-sets/events/${id}`)).status).toEqual(404)
                createdSetIds.splice(createdSetIds.indexOf(set.id), 1)
            })
            it('deletes many time sets', async () => {
                const first = await createSet({name: name('del1'), reseller_id: resellerA})
                const second = await createSet({name: name('del2'), reseller_id: resellerB})
                const response = await send('delete', '/api/time-sets', [first.id, second.id])
                expect(response.status).toEqual(204)
                for (const id of [first.id, second.id]) {
                    expect((await get(`/api/time-sets/${id}`)).status).toEqual(404)
                    createdSetIds.splice(createdSetIds.indexOf(id), 1)
                }
            })
            it('fails an unknown id', async () => {
                const response = await send('delete', '/api/time-sets/999999999', {})
                expect(response.status).toEqual(404)
            })
        })

        describe('iCalendar upload', () => {
            const dayLines = (comment: string): string[] => ['DTSTART:20310303T080000', 'DTEND:20310303T170000', `DESCRIPTION:${comment}`]
            const createdByUpload = async (setName: string): Promise<number> => {
                const listed = await get(`/api/time-sets?name=${encodeURIComponent(setName)}`)
                return listed.body.total_count as number
            }

            it('creates a time set with the name field and the events of the file', async () => {
                const response = await upload('post', '/api/time-sets', calendar(['NAME:calendar name'], dayLines('one'), dayLines('two')), {
                    reseller_id: `${resellerA}`,
                    name: name('upload'),
                })
                expect(response.status).toEqual(201)
                const body = response.body.data[0] as TimeSetBody
                createdSetIds.push(body.id)
                expect(body).toMatchObject({name: name('upload'), reseller_id: resellerA})
                expect((await eventsOf(body.id)).map(e => e.comment).sort()).toEqual(['one', 'two'])
            })
            it('fails without name field, the calendar name is not taken', async () => {
                const response = await upload('post', '/api/time-sets', calendar([`NAME:${name('named')}`], dayLines('x')), {reseller_id: `${resellerA}`})
                expect(response.status).toEqual(422)
                expect(new Set(pointers(response))).toEqual(new Set(['/name']))
                expect(await createdByUpload(name('named'))).toEqual(0)
            })
            it('creates a time set without events from a calendar without events', async () => {
                const response = await upload('post', '/api/time-sets', calendar([]), {reseller_id: `${resellerA}`, name: name('noevents')})
                expect(response.status).toEqual(201)
                createdSetIds.push(response.body.data[0].id as number)
                expect(await eventsOf(response.body.data[0].id as number)).toEqual([])
            })
            it('accepts application/octet-stream', async () => {
                const response = await upload('post', '/api/time-sets', calendar([], dayLines('x')), {reseller_id: `${resellerA}`, name: name('octet')}, {contentType: 'application/octet-stream'})
                expect(response.status).toEqual(201)
                createdSetIds.push(response.body.data[0].id as number)
            })
            it('rejects other mime types', async () => {
                const response = await upload('post', '/api/time-sets', calendar([], dayLines('x')), {reseller_id: `${resellerA}`, name: name('text')}, {contentType: 'text/plain'})
                expect(response.status).toEqual(422)
                expect(response.body.errorCode).toEqual('FILE_MIME_TYPE_NOT_SUPPORTED')
                expect(await createdByUpload(name('text'))).toEqual(0)
            })
            it('creates a time set without events from a multipart request without file', async () => {
                const response = await as('admin', request(app.getHttpServer()).post('/api/time-sets'))
                    .field('name', name('nofile'))
                    .field('reseller_id', `${resellerA}`)
                expect(response.status).toEqual(201)
                createdSetIds.push(response.body.data[0].id as number)
                expect(response.body.data[0]).toMatchObject({name: name('nofile'), reseller_id: resellerA})
                expect(await eventsOf(response.body.data[0].id as number)).toEqual([])
            })
            it.each([
                ['a malformed file', 'this is no calendar', 'CALENDAR_MALFORMED'],
                ['an unsupported property', calendar([], ['DTSTART:20310303T080000', 'EXDATE:20310304T080000']), 'CALENDAR_UNSUPPORTED_PROPERTY'],
                ['an event without DTSTART', calendar([], ['SUMMARY:none']), 'CALENDAR_MISSING_DTSTART'],
                ['an unknown timezone', calendar([], ['DTSTART;TZID=Nowhere/Land:20310303T080000']), 'CALENDAR_UNKNOWN_TIMEZONE'],
            ])('rejects %s and creates nothing', async (_label, text, errorCode) => {
                const setName = name('badfile')
                const response = await upload('post', '/api/time-sets', text, {reseller_id: `${resellerA}`, name: setName})
                expect(response.status).toEqual(422)
                expect(response.body.errorCode).toEqual(errorCode)
                expect(await createdByUpload(setName)).toEqual(0)
            })
            it('validates the events like the JSON ones', async () => {
                const setName = name('badrule')
                const response = await upload('post', '/api/time-sets', calendar([], dayLines('ok'), ['DTSTART:20310303T080000', 'RRULE:FREQ=DAILY;BYSETPOS=0']), {reseller_id: `${resellerA}`, name: setName})
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/events/1/bysetpos'])
                expect(await createdByUpload(setName)).toEqual(0)
            })
            it('fails a name used by another time set', async () => {
                const response = await upload('post', '/api/time-sets', calendar([], dayLines('x')), {reseller_id: `${resellerA}`, name: name('upload')})
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/name'])
            })
            it('fails a reseller_id that is no number', async () => {
                const response = await upload('post', '/api/time-sets', calendar([], dayLines('x')), {reseller_id: 'abc', name: name('badreseller')})
                expect(response.status).toEqual(422)
                expect(pointers(response)).toContain('/reseller_id')
            })
            it('fails without reseller_id for an admin', async () => {
                const response = await upload('post', '/api/time-sets', calendar([], dayLines('x')), {name: name('noreseller')})
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/reseller_id'])
            })
            it('fails a reseller_id from a reseller', async () => {
                const response = await upload('post', '/api/time-sets', calendar([], dayLines('x')), {reseller_id: `${resellerA}`, name: name('forced')}, {role: 'reseller'})
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/reseller_id'])
            })
            it('creates the time set of the own reseller for a reseller', async () => {
                const response = await upload('post', '/api/time-sets', calendar([], dayLines('x')), {name: name('byreseller')}, {role: 'reseller'})
                expect(response.status).toEqual(201)
                createdSetIds.push(response.body.data[0].id as number)
                expect(response.body.data[0].reseller_id).toEqual(resellerA)
            })

            it('converts the times to the platform time', async () => {
                const text = calendar([], [
                    'DTSTART:20311201T070000Z', 'DTEND:20311201T150000Z', 'DESCRIPTION:utc',
                ], [
                    'DTSTART;TZID=Europe/Vienna:20310701T090000', 'DTEND;TZID=Europe/Vienna:20310701T170000', 'DESCRIPTION:vienna',
                ], [
                    'DTSTART;TZID=America/New_York:20310701T090000', 'DESCRIPTION:new york', 'RRULE:FREQ=DAILY;UNTIL=20310731T120000Z',
                ], [
                    'DTSTART:20310701T090000', 'DESCRIPTION:floating',
                ], [
                    'DTSTART;VALUE=DATE:20310701', 'DTEND;VALUE=DATE:20310702', 'DESCRIPTION:date',
                ])
                const response = await upload('post', '/api/time-sets', text, {reseller_id: `${resellerA}`, name: name('times')})
                expect(response.status).toEqual(201)
                createdSetIds.push(response.body.data[0].id as number)
                const events = new Map((await eventsOf(response.body.data[0].id as number)).map(e => [e.comment, e as EventBody & {until?: string}]))
                expect(events.get('utc')).toMatchObject({start: inPlatformZone('2031-12-01T07:00:00Z'), end: inPlatformZone('2031-12-01T15:00:00Z')})
                expect(events.get('vienna')).toMatchObject({start: inPlatformZone('2031-07-01T07:00:00Z'), end: inPlatformZone('2031-07-01T15:00:00Z')})
                expect(events.get('new york')).toMatchObject({start: inPlatformZone('2031-07-01T13:00:00Z'), until: inPlatformZone('2031-07-31T12:00:00Z')})
                expect(events.get('floating')?.start).toEqual('2031-07-01 09:00:00')
                expect(events.get('date')).toMatchObject({start: '2031-07-01 00:00:00', end: '2031-07-02 00:00:00'})
            })

            it('replaces the events of a time set on PUT', async () => {
                const set = await createSet({name: name('replace'), reseller_id: resellerA, events: [dayEvent('old1'), dayEvent('old2')]})
                const response = await upload('put', `/api/time-sets/${set.id}`, calendar(['NAME:ignored'], dayLines('new')), {reseller_id: `${resellerA}`, name: name('replaced')})
                expect(response.status).toEqual(200)
                expect(response.body.name).toEqual(name('replaced'))
                expect((await eventsOf(set.id)).map(e => e.comment)).toEqual(['new'])
            })
            it('fails a PUT without name field', async () => {
                const set = await createSet({name: name('replace2'), reseller_id: resellerA, events: [dayEvent('kept')]})
                const response = await upload('put', `/api/time-sets/${set.id}`, calendar([`NAME:${name('replaced2')}`], dayLines('new')), {reseller_id: `${resellerA}`})
                expect(response.status).toEqual(422)
                expect(new Set(pointers(response))).toEqual(new Set(['/name']))
                expect((await eventsOf(set.id)).map(e => e.comment)).toEqual(['kept'])
            })
            it('keeps the time set when the file of a PUT is rejected', async () => {
                const set = await createSet({name: name('keep'), reseller_id: resellerA, events: [dayEvent('kept')]})
                const response = await upload('put', `/api/time-sets/${set.id}`, 'no calendar', {reseller_id: `${resellerA}`, name: name('keep')})
                expect(response.status).toEqual(422)
                expect((await eventsOf(set.id)).map(e => e.comment)).toEqual(['kept'])
            })
            it('does not accept a file on PATCH', async () => {
                const set = await createSet({name: name('nopatch'), reseller_id: resellerA})
                const response = await as('admin', request(app.getHttpServer()).patch(`/api/time-sets/${set.id}`))
                    .attach('file', Buffer.from(calendar([], dayLines('x'))), {filename: 'time-set.ics', contentType: 'text/calendar'})
                expect(response.status).toBeGreaterThanOrEqual(400)
                expect(await eventsOf(set.id)).toEqual([])
            })
        })

        describe('iCalendar download', () => {
            let withEvents: TimeSetBody
            let withoutEvents: TimeSetBody

            it('creates the time sets', async () => {
                withEvents = await createSet({
                    name: `ts dl.x-y ${suffix}`,
                    reseller_id: resellerA,
                    events: [dayEvent('first'), {start: '2031-03-04 08:00:00', freq: 'weekly', byday: 'MO,-1FR', wkst: 'MO', count: 3}],
                })
                withoutEvents = await createSet({name: name('dlempty'), reseller_id: resellerA})
            })
            it('returns the calendar of call routing as a file', async () => {
                const response = await download(withEvents.id)
                expect(response.status).toEqual(200)
                expect(response.headers['content-type']).toEqual('text/calendar; charset=utf-8')
                expect(response.headers['content-disposition']).toEqual(`attachment; filename="ts dl_x_y ${suffix}_${withEvents.id}.ics"`)
                const view = await db.provisioning.VTimeSetIcal.findOneByOrFail({id: withEvents.id})
                expect(response.text).toEqual(view.ical)
                expect(response.text).toContain('BEGIN:VEVENT')
            })
            it('returns a calendar without events for a time set without events', async () => {
                const response = await download(withoutEvents.id)
                expect(response.status).toEqual(200)
                expect(response.text).toEqual([
                    'BEGIN:VCALENDAR',
                    'PRODID:-//Mozilla.org/NONSGML Mozilla Calendar V1.1//EN',
                    `NAME:${withoutEvents.name}`,
                    'VERSION:2.0',
                    'END:VCALENDAR',
                    '',
                ].join('\n'))
            })
            it('returns JSON (HAL without an explicit application/json) without an Accept header and for */*', async () => {
                for (const accept of [undefined, '*/*', 'application/json']) {
                    const req = request(app.getHttpServer()).get(`/api/time-sets/${withEvents.id}`).set(...headers['admin'])
                    const response = await (accept ? req.set('Accept', accept) : req)
                    expect(response.status).toEqual(200)
                    expect(response.headers['content-type']).toMatch(accept == 'application/json' ? /^application\/json/ : /^application\/hal\+json/)
                    expect(response.body.id).toEqual(withEvents.id)
                }
            })
            it('returns 404 for a time set of another reseller and an unknown one', async () => {
                const foreign = await createSet({name: name('dlforeign'), reseller_id: resellerB})
                expect((await download(foreign.id, 'reseller')).status).toEqual(404)
                expect((await download(999999999)).status).toEqual(404)
            })
            it('lets a reseller download its own time sets', async () => {
                expect((await download(withEvents.id, 'reseller')).status).toEqual(200)
            })
            it('rejects expand for the calendar', async () => {
                const response = await request(app.getHttpServer())
                    .get(`/api/time-sets/${withEvents.id}?expand=reseller_id`)
                    .set(...headers['admin'])
                    .set('Accept', 'text/calendar')
                expect(response.status).toEqual(400)
            })
            it('keeps the events through download and upload', async () => {
                const original = await createSet({
                    name: name('roundtrip'),
                    reseller_id: resellerA,
                    events: [
                        dayEvent('rt1'),
                        {start: '2031-03-04 08:00:00', duration: 'PT2H30M', freq: 'weekly', interval: 2, count: 5, byday: 'MO,-1FR', wkst: 'MO', comment: 'rt2'},
                        {start: '2031-03-05 08:00:00', freq: 'monthly', until: '2031-12-31 23:59:59', bymonthday: '1,15', bymonth: '1,2,3', byhour: '9', byminute: '0,30', bysecond: '0', comment: 'rt3'},
                        {start: '2031-03-06 08:00:00', freq: 'yearly', byyearday: '1,100', byweekno: '1,26', bysetpos: '1,-1', comment: 'rt4'},
                        {start: '2031-03-07 08:00:00'},
                    ],
                })
                const file = await download(original.id)
                expect(file.status).toEqual(200)
                const response = await upload('post', '/api/time-sets', file.text, {reseller_id: `${resellerA}`, name: name('roundtrip copy')}, {contentType: 'application/octet-stream'})
                expect(response.status).toEqual(201)
                const copy = response.body.data[0] as TimeSetBody
                createdSetIds.push(copy.id)

                const byStart = (a: EventBody, b: EventBody): number => a.start.localeCompare(b.start)
                const before = (await eventsOf(original.id)).sort(byStart)
                const after = (await eventsOf(copy.id)).sort(byStart)
                expect(after.length).toEqual(5)
                const fields = ({id: _id, time_set_id: _setId, comment: _comment, ...rest}: Record<string, unknown>): Record<string, unknown> => rest
                expect(after.map(fields)).toEqual(before.map(fields))
                before.forEach((event, index) => {
                    if (event.comment)
                        expect(after[index].comment).toEqual(event.comment)
                })
            })
        })

        describe('journals', () => {
            it('journals the writes of a time set and its events', async () => {
                const set = await createSet({name: name('journal'), reseller_id: resellerA, events: [dayEvent('journal')]})
                expect((await send('put', `/api/time-sets/${set.id}`, {name: name('journal'), reseller_id: resellerA, events: [dayEvent('journal2')]})).status).toEqual(200)
                const journals = await db.billing.Journal.find({
                    where: {resource_name: 'time-sets', resource_id: set.id, username: adminCreds.username, timestamp: MoreThanOrEqual(startedAt)},
                    order: {id: 'ASC'},
                })
                expect(journals.map(j => j.operation)).toEqual(['create', 'update'])
                const response = await get(`/api/time-sets/${set.id}/journal`)
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(2)
            })
        })
    })

    describe('Time Set DELETE', () => {
        it('deletes the ncos levels, peering groups and time sets', async () => {
            for (const id of createdLevelIds)
                await send('delete', `/api/ncos/levels/${id}`, {})
            for (const id of createdGroupIds)
                await send('delete', `/api/peerings/groups/${id}`, {})
            for (const id of createdSetIds) {
                const result = await send('delete', `/api/time-sets/${id}`, {})
                expect(result.status).toEqual(204)
            }
        })
        it('deletes the fixtures', async () => {
            for (const id of provisioningSubscriberIds)
                await db.provisioning.VoipSubscriber.delete(id)
            if (customerId) {
                const subscribers = await BillingVoipSubscriber.findBy({contract_id: customerId})
                if (subscribers.length)
                    await BillingVoipSubscriber.delete(subscribers.map(sub => sub.id))
                await db.billing.Contract.delete(customerId)
            }
            if (customerContactId)
                await db.billing.Contact.delete(customerContactId)
            if (billingDomainId)
                await db.billing.Domain.delete(billingDomainId)
            if (provisioningDomainId)
                await db.provisioning.VoipDomain.delete(provisioningDomainId)
            if (createdContractIds.length)
                await db.billing.Contract.delete(createdContractIds)
            await db.billing.Admin.delete({login: In([resellerCreds.username, ccareCreds.username, linterceptCreds.username])})
            if (resellerIds.length) {
                await db.billing.Journal.delete({reseller_id: In(resellerIds)})
                await db.billing.Reseller.delete(resellerIds)
            }
            if (resellerContractIds.length)
                await db.billing.Contract.delete(resellerContractIds)
        })
        it('deletes the journals', async () => {
            await db.billing.Journal.delete({
                username: In([adminCreds.username, resellerCreds.username]),
                timestamp: MoreThanOrEqual(startedAt),
            })
        })
        it('deletes the mock admin', async () => {
            await db.billing.Admin.delete({login: adminCreds.username})
        })
    })
})
