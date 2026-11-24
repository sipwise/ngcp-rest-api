import {INestApplication} from '@nestjs/common'
import {Test} from '@nestjs/testing'
import request from 'supertest'
import {In, MoreThanOrEqual} from 'typeorm'

import {TimeSetEventModule} from './event.module'

import {TimeSetModule} from '~/api/time-sets/time-set.module'
import {AppModule} from '~/app.module'
import {AppService} from '~/app.service'
import {setupApp} from '~/app.setup'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {db} from '~/entities'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'
import {toLocalDateTime} from '~/helpers/date.helper'
import {ErrorEntry} from '~/helpers/errors.helper'
import {Operation as PatchOperation} from '~/helpers/patch.helper'

type EventPost = {
    time_set_id?: number
    start?: string
    end?: string | null
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

type EventBody = EventPost & {
    id: number
    time_set_id: number
    start: string
    time_set_id_expand?: {id: number}
}

const eventFields = [
    'start',
    'end',
    'duration',
    'freq',
    'interval',
    'until',
    'count',
    'bysecond',
    'byminute',
    'byhour',
    'byday',
    'bymonthday',
    'byyearday',
    'byweekno',
    'bymonth',
    'bysetpos',
    'wkst',
    'comment',
]

describe('Time Set Event', () => {
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
    const setIds: number[] = []
    const resellerIds: number[] = []
    const resellerContractIds: number[] = []
    let resellerA: number
    let resellerB: number
    let setA: number
    let setA2: number
    let setB: number

    const as = (role: string, req: request.Test): request.Test => req
        .set(...headers[role])
        .set('Accept', 'application/json')
    const get = (url: string, role = 'admin'): request.Test => as(role, request(app.getHttpServer()).get(url))
    const send = (method: 'post' | 'put' | 'delete', url: string, body: object, role = 'admin'): request.Test =>
        as(role, request(app.getHttpServer())[method](url))
            .set('Content-Type', 'application/json')
            .set('Prefer', method == 'delete' ? 'return=minimal' : 'return=representation')
            .send(body)
    const patch = (url: string, operations: PatchOperation[] | object, role = 'admin'): request.Test =>
        as(role, request(app.getHttpServer()).patch(url))
            .set('Content-Type', 'application/json-patch+json')
            .set('Prefer', 'return=representation')
            .send(operations)
    const pointers = (response: request.Response): string[] =>
        (response.body.errors as ErrorEntry[]).map(e => e.pointer)
    const upload = (url: string, text: string, fields: Record<string, string> = {}, options: {role?: string, contentType?: string} = {}): request.Test => {
        const req = as(options.role ?? 'admin', request(app.getHttpServer()).post(url)).set('Prefer', 'return=representation')
        for (const [key, value] of Object.entries(fields))
            req.field(key, value)
        return req.attach('file', Buffer.from(text), {filename: 'events.ics', contentType: options.contentType ?? 'text/calendar'})
    }
    const calendar = (...events: string[][]): string =>
        ['BEGIN:VCALENDAR', 'VERSION:2.0', ...events.flatMap(lines => ['BEGIN:VEVENT', ...lines, 'END:VEVENT']), 'END:VCALENDAR', ''].join('\r\n')
    const pause = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

    const day = (comment: string): EventPost => ({start: '2031-03-03 08:00:00', end: '2031-03-03 17:00:00', comment})

    const createEvent = async (setId: number, post: EventPost, role = 'admin'): Promise<EventBody> => {
        const response = await send('post', `/api/time-sets/${setId}/events`, post, role)
        expect(response.status).toEqual(201)
        return response.body.data[0] as EventBody
    }
    const createSet = async (label: string, resellerId: number): Promise<number> => {
        const response = await send('post', '/api/time-sets', {name: `tse_${label}_${suffix}`, reseller_id: resellerId})
        expect(response.status).toEqual(201)
        const id = +response.body.data[0].id
        setIds.push(id)
        return id
    }
    const storedStart = async (id: number): Promise<number> =>
        (await db.provisioning.VoipTimePeriod.findOneByOrFail({id})).start.getTime()

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
            name: `tse_${label}_${suffix}`,
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

    it('create the time sets', async () => {
        setA = await createSet('a', resellerA)
        setA2 = await createSet('a2', resellerA)
        setB = await createSet('b', resellerB)
    })

    describe('', () => { // main tests block
        describe('event shapes', () => {
            const shapes: [string, EventPost][] = [
                ['a single event without recurrence and end', {start: '2031-01-06 09:00:00', comment: 'single'}],
                ['a single event with end', {start: '2031-01-06 09:00:00', end: '2031-01-06 17:00:00'}],
                ['weekly on MO,WE,FR until a date', {start: '2031-01-06 09:00:00', end: '2031-01-06 17:00:00', freq: 'weekly', byday: 'MO,WE,FR', until: '2031-12-31 23:59:59'}],
                ['monthly on the first friday with a count', {start: '2031-01-03 09:00:00', freq: 'monthly', byday: '+1FR', count: 12}],
                ['yearly by month and month day', {start: '2031-12-24 00:00:00', end: '2031-12-26 00:00:00', freq: 'yearly', bymonth: '12', bymonthday: '24,25'}],
                ['monthly on the last sunday', {start: '2031-01-26 09:00:00', freq: 'monthly', byday: '-1SU'}],
                ['monthly on the last weekday', {start: '2031-01-31 09:00:00', freq: 'monthly', byday: 'MO,TU,WE,TH,FR', bysetpos: '-1'}],
                ['daily with a duration instead of end', {start: '2031-01-06 09:00:00', duration: 'PT2H30M', freq: 'daily'}],
                ['every second week with week start', {start: '2031-01-06 09:00:00', freq: 'weekly', interval: 2, byday: 'MO', wkst: 'SU'}],
                ['all by rules', {start: '2031-01-06 09:00:00', freq: 'yearly', bysecond: '0,30', byminute: '0,15', byhour: '9,17', byyearday: '1,-1', byweekno: '1,-1', bymonth: '1,7'}],
            ]
            it.each(shapes)('stores and returns %s', async (_label, post) => {
                const created = await createEvent(setA, post)
                expect(created.time_set_id).toEqual(setA)
                const read = (await get(`/api/time-sets/${setA}/events/${created.id}`)).body as Record<string, unknown>
                for (const field of eventFields)
                    expect(read[field]).toEqual((post as Record<string, unknown>)[field] ?? null)
            })
        })

        describe('POST', () => {
            it('creates an event on the nested route', async () => {
                const created = await createEvent(setA, day('nested'))
                expect(created.time_set_id).toEqual(setA)
                expect(created.comment).toEqual('nested')
            })
            it('creates an event on the flat route with time_set_id', async () => {
                const response = await send('post', '/api/time-sets/events', {...day('flat'), time_set_id: setA2})
                expect(response.status).toEqual(201)
                expect(response.body.data[0].time_set_id).toEqual(setA2)
            })
            it('creates many events on the nested route', async () => {
                const response = await send('post', `/api/time-sets/${setA}/events`, [day('many1'), day('many2')])
                expect(response.status).toEqual(201)
                expect((response.body.data as EventBody[]).map(e => e.comment)).toEqual(['many1', 'many2'])
            })
            it('creates many events of different time sets on the flat route', async () => {
                const response = await send('post', '/api/time-sets/events', [
                    {...day('flat1'), time_set_id: setA},
                    {...day('flat2'), time_set_id: setA2},
                ])
                expect(response.status).toEqual(201)
                expect((response.body.data as EventBody[]).map(e => e.time_set_id)).toEqual([setA, setA2])
            })
            it('fails the flat route without time_set_id', async () => {
                const response = await send('post', '/api/time-sets/events', day('none'))
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/time_set_id'])
            })
            it('fails an unknown time set', async () => {
                const response = await send('post', '/api/time-sets/999999999/events', day('unknown'))
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/time_set_id'])
            })
            it('names the failing item of many events', async () => {
                const response = await send('post', `/api/time-sets/${setA}/events`, [day('ok'), {...day('bad'), duration: 'PT1H'}])
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/1/duration'])
            })
        })

        describe('iCalendar upload', () => {
            let setUpload: number

            it('appends the events of the file and keeps the existing ones', async () => {
                setUpload = await createSet('upload', resellerA)
                await createEvent(setUpload, day('existing'))
                const response = await upload(`/api/time-sets/${setUpload}/events`, calendar(
                    ['DTSTART:20310303T080000', 'DTEND:20310303T170000', 'DESCRIPTION:file1'],
                    ['DTSTART:20310304T080000', 'DURATION:PT1H', 'RRULE:FREQ=WEEKLY;COUNT=3;BYDAY=TU', 'DESCRIPTION:file2'],
                ))
                expect(response.status).toEqual(201)
                const created = response.body.data as EventBody[]
                expect(created.map(e => e.comment)).toEqual(['file1', 'file2'])
                expect(created.every(e => e.time_set_id == setUpload)).toBe(true)
                expect(created[1]).toMatchObject({freq: 'weekly', count: 3, byday: 'TU', duration: 'PT1H'})
                const listed = await get(`/api/time-sets/${setUpload}/events?rows=100`)
                expect((listed.body.data as EventBody[]).map(e => e.comment).sort()).toEqual(['existing', 'file1', 'file2'])
            })
            it('accepts application/octet-stream', async () => {
                const response = await upload(`/api/time-sets/${setUpload}/events`, calendar(['DTSTART:20310305T080000', 'DESCRIPTION:octet']), {}, {contentType: 'application/octet-stream'})
                expect(response.status).toEqual(201)
                expect(response.body.data[0].comment).toEqual('octet')
            })
            it('fails without a time set in the path', async () => {
                const response = await upload('/api/time-sets/events', calendar(['DTSTART:20310305T080000'], ['DTSTART:20310306T080000']))
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/0/time_set_id', '/1/time_set_id'])
            })
            it('rejects other mime types', async () => {
                const response = await upload(`/api/time-sets/${setUpload}/events`, calendar(['DTSTART:20310305T080000']), {}, {contentType: 'text/plain'})
                expect(response.status).toEqual(422)
                expect(response.body.errorCode).toEqual('FILE_MIME_TYPE_NOT_SUPPORTED')
            })
            it('rejects a malformed file and appends nothing', async () => {
                const before = (await get(`/api/time-sets/${setUpload}/events?rows=100`)).body.total_count as number
                const response = await upload(`/api/time-sets/${setUpload}/events`, 'no calendar')
                expect(response.status).toEqual(422)
                expect(response.body.errorCode).toEqual('CALENDAR_MALFORMED')
                expect((await get(`/api/time-sets/${setUpload}/events?rows=100`)).body.total_count).toEqual(before)
            })
            it('validates the events like the JSON ones and appends nothing', async () => {
                const before = (await get(`/api/time-sets/${setUpload}/events?rows=100`)).body.total_count as number
                const invalid = await upload(`/api/time-sets/${setUpload}/events`, calendar(
                    ['DTSTART:20310303T080000'],
                    ['DTSTART:20310303T080000', 'RRULE:FREQ=DAILY;BYSETPOS=0'],
                ))
                expect(invalid.status).toEqual(422)
                expect(pointers(invalid)).toEqual(['/1/bysetpos'])
                const rule = await upload(`/api/time-sets/${setUpload}/events`, calendar(
                    ['DTSTART:20310303T080000'],
                    ['DTSTART:20310303T080000', 'DTEND:20310303T090000', 'DURATION:PT1H'],
                ))
                expect(rule.status).toEqual(422)
                expect(pointers(rule)).toEqual(['/1/duration'])
                expect((await get(`/api/time-sets/${setUpload}/events?rows=100`)).body.total_count).toEqual(before)
            })
            it('fails a time set of another reseller', async () => {
                const response = await upload(`/api/time-sets/${setB}/events`, calendar(['DTSTART:20310305T080000']), {}, {role: 'reseller'})
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/0/time_set_id'])
            })
        })

        describe('validation', () => {
            const recurring = {freq: 'daily'}
            const cases: [string, EventPost, string][] = [
                ['end and duration', {...day('x'), duration: 'PT1H'}, '/duration'],
                ['end before start', {start: '2031-03-03 09:00:00', end: '2031-03-03 08:00:00'}, '/end'],
                ['until and count', {start: '2031-03-03 09:00:00', ...recurring, until: '2031-04-03 09:00:00', count: 3}, '/count'],
                ['interval without freq', {start: '2031-03-03 09:00:00', interval: 2}, '/interval'],
                ['count without freq', {start: '2031-03-03 09:00:00', count: 2}, '/count'],
                ['until without freq', {start: '2031-03-03 09:00:00', until: '2031-04-03 09:00:00'}, '/until'],
                ['byday without freq', {start: '2031-03-03 09:00:00', byday: 'MO'}, '/byday'],
                ['bymonth without freq', {start: '2031-03-03 09:00:00', bymonth: '1'}, '/bymonth'],
                ['bysetpos without freq', {start: '2031-03-03 09:00:00', bysetpos: '1'}, '/bysetpos'],
                ['wkst without freq', {start: '2031-03-03 09:00:00', wkst: 'MO'}, '/wkst'],
                ['an invalid freq', {start: '2031-03-03 09:00:00', freq: 'sometimes'}, '/freq'],
                ['an uppercase freq', {start: '2031-03-03 09:00:00', freq: 'DAILY'}, '/freq'],
                ['an invalid wkst', {start: '2031-03-03 09:00:00', ...recurring, wkst: 'XX'}, '/wkst'],
                ['a v1 weekday SO', {start: '2031-03-03 09:00:00', ...recurring, byday: '1SO'}, '/byday'],
                ['an ordinal above 53', {start: '2031-03-03 09:00:00', ...recurring, byday: '54MO'}, '/byday'],
                ['spaces in byday', {start: '2031-03-03 09:00:00', ...recurring, byday: 'MO, TU'}, '/byday'],
                ['spaces in byhour', {start: '2031-03-03 09:00:00', ...recurring, byhour: '1, 2'}, '/byhour'],
                ['bysecond 60', {start: '2031-03-03 09:00:00', ...recurring, bysecond: '60'}, '/bysecond'],
                ['byminute 60', {start: '2031-03-03 09:00:00', ...recurring, byminute: '60'}, '/byminute'],
                ['byhour 24', {start: '2031-03-03 09:00:00', ...recurring, byhour: '24'}, '/byhour'],
                ['bymonthday 0', {start: '2031-03-03 09:00:00', ...recurring, bymonthday: '0'}, '/bymonthday'],
                ['bymonthday 32', {start: '2031-03-03 09:00:00', ...recurring, bymonthday: '1,32'}, '/bymonthday'],
                ['byyearday 367', {start: '2031-03-03 09:00:00', ...recurring, byyearday: '367'}, '/byyearday'],
                ['byweekno -54', {start: '2031-03-03 09:00:00', ...recurring, byweekno: '-54'}, '/byweekno'],
                ['bymonth 13', {start: '2031-03-03 09:00:00', ...recurring, bymonth: '13'}, '/bymonth'],
                ['a negative bymonth', {start: '2031-03-03 09:00:00', ...recurring, bymonth: '-1'}, '/bymonth'],
                ['bysetpos 0', {start: '2031-03-03 09:00:00', ...recurring, bysetpos: '0'}, '/bysetpos'],
                ['a by list longer than 45 characters', {start: '2031-03-03 09:00:00', ...recurring, byyearday: Array(20).fill('100').join(',')}, '/byyearday'],
                ['a duration without P', {start: '2031-03-03 09:00:00', duration: '1D'}, '/duration'],
                ['a signed duration', {start: '2031-03-03 09:00:00', duration: '-PT1H'}, '/duration'],
                ['a duration without a value', {start: '2031-03-03 09:00:00', duration: 'P'}, '/duration'],
                ['interval 0', {start: '2031-03-03 09:00:00', ...recurring, interval: 0}, '/interval'],
                ['count 0', {start: '2031-03-03 09:00:00', ...recurring, count: 0}, '/count'],
                ['a missing start', {end: '2031-03-03 09:00:00'}, '/start'],
                ['an invalid start', {start: 'garbage'}, '/start'],
                ['an invalid end', {start: '2031-03-03 09:00:00', end: '2031-13-45 99:00:00'}, '/end'],
            ]
            it.each(cases)('rejects %s', async (_label, body, pointer) => {
                const response = await send('post', `/api/time-sets/${setA}/events`, body)
                expect(response.status).toEqual(422)
                expect(pointers(response)).toContain(pointer)
            })
            it('rejects an unknown field', async () => {
                const response = await send('post', `/api/time-sets/${setA}/events`, {...day('x'), contract_id: 1})
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/contract_id'])
            })
            it('accepts the range limits', async () => {
                const created = await createEvent(setA, {
                    start: '2031-03-03 09:00:00',
                    freq: 'yearly',
                    bysecond: '0,59',
                    byminute: '0,59',
                    byhour: '0,23',
                    bymonthday: '-31,31',
                    byyearday: '-366,366',
                    byweekno: '-53,53',
                    bymonth: '1,12',
                    bysetpos: '-366,366',
                    byday: '-53MO,53SU,SA',
                })
                expect(created.id).toBeDefined()
            })
        })

        describe('local date-times', () => {
            let eventId: number

            it('returns start, end and until as written', async () => {
                const created = await createEvent(setA, {
                    start: '2031-06-15 08:30:15',
                    end: '2031-06-15 17:45:30',
                    freq: 'daily',
                    until: '2031-12-31 23:59:59',
                })
                eventId = created.id
                expect(created.start).toEqual('2031-06-15 08:30:15')
                expect(created.end).toEqual('2031-06-15 17:45:30')
                expect(created.until).toEqual('2031-12-31 23:59:59')
            })
            it.each(['UTC', 'Asia/Tokyo', 'America/New_York'])('returns the same values with tz=%s', async tz => {
                const response = await get(`/api/time-sets/${setA}/events/${eventId}?tz=${tz}`)
                expect(response.status).toEqual(200)
                expect([response.body.start, response.body.end, response.body.until])
                    .toEqual(['2031-06-15 08:30:15', '2031-06-15 17:45:30', '2031-12-31 23:59:59'])
            })
            it('converts an input with an offset to the platform wall clock', async () => {
                const created = await createEvent(setA, {
                    start: '2031-06-15T08:00:00+02:00',
                    end: '2031-06-15T10:00:00Z',
                })
                expect(created.start).toEqual(toLocalDateTime(new Date('2031-06-15T08:00:00+02:00')))
                expect(created.end).toEqual(toLocalDateTime(new Date('2031-06-15T10:00:00Z')))
            })
            it('returns no end as null', async () => {
                const created = await createEvent(setA, {start: '2031-06-15 08:30:15'})
                expect(created.end).toBeNull()
                const read = await get(`/api/time-sets/${setA}/events/${created.id}`)
                expect(read.body.end).toBeNull()
            })
            it('removes the end with a null end', async () => {
                const response = await send('put', `/api/time-sets/${setA}/events/${eventId}`, {start: '2031-06-15 08:30:15', end: null})
                expect(response.status).toEqual(200)
                expect(response.body.end).toBeNull()
            })
        })

        describe('start', () => {
            let eventId: number
            let before: number

            it('is kept by a PATCH of another field', async () => {
                eventId = (await createEvent(setA, {start: '2031-06-15 08:30:15', comment: 'keep start'})).id
                before = await storedStart(eventId)
                expect(before).toEqual(new Date('2031-06-15T08:30:15').getTime())
                await pause(1100)
                const response = await patch(`/api/time-sets/${setA}/events/${eventId}`, [{op: 'replace', path: '/comment', value: 'patched'}])
                expect(response.status).toEqual(200)
                expect(response.body.start).toEqual('2031-06-15 08:30:15')
                expect(await storedStart(eventId)).toEqual(before)
            })
            it('is kept by a PUT with the same start', async () => {
                await pause(1100)
                const response = await send('put', `/api/time-sets/${setA}/events/${eventId}`, {start: '2031-06-15 08:30:15', comment: 'put'})
                expect(response.status).toEqual(200)
                expect(await storedStart(eventId)).toEqual(before)
            })
            it('is kept by a bulk PATCH', async () => {
                await pause(1100)
                const response = await patch(`/api/time-sets/${setA}/events`, {[eventId]: [{op: 'replace', path: '/comment', value: 'bulk'}]})
                expect(response.status).toEqual(200)
                expect(await storedStart(eventId)).toEqual(before)
            })
            it('is changed by a PATCH of start', async () => {
                const response = await patch(`/api/time-sets/${setA}/events/${eventId}`, [{op: 'replace', path: '/start', value: '2031-07-01 10:00:00'}])
                expect(response.status).toEqual(200)
                expect(response.body.start).toEqual('2031-07-01 10:00:00')
            })
        })

        describe('GET', () => {
            let ids: number[]
            let set: number

            it('lists the events of a time set on the nested route', async () => {
                set = await createSet('list', resellerA)
                const other = await createSet('list_other', resellerA)
                const created = [
                    await createEvent(set, {...day('l1'), freq: 'daily'}),
                    await createEvent(set, {...day('l2'), freq: 'weekly', byday: 'MO'}),
                    await createEvent(set, day('l3')),
                ]
                await createEvent(other, day('other'))
                ids = created.map(e => e.id)
                const response = await get(`/api/time-sets/${set}/events`)
                expect(response.status).toEqual(200)
                expect((response.body.data as EventBody[]).map(e => e.id).sort()).toEqual([...ids].sort())
                expect(response.body.total_count).toEqual(3)
                expect((await get(`/api/time-sets/${other}/events`)).body.total_count).toEqual(1)
            })
            it('filters the flat route by time_set_id', async () => {
                const response = await get(`/api/time-sets/events?time_set_id=${setB}`)
                expect(response.status).toEqual(200)
                expect((response.body.data as EventBody[]).every(e => e.time_set_id == setB)).toBe(true)
            })
            it('filters by freq, comment and id', async () => {
                const byFreq = await get(`/api/time-sets/events?id=${ids.join(',')}&freq=weekly`)
                expect((byFreq.body.data as EventBody[]).map(e => e.id)).toEqual([ids[1]])
                const byComment = await get(`/api/time-sets/events?id=${ids.join(',')}&comment=l*`)
                expect(byComment.body.total_count).toEqual(3)
                const byIds = await get(`/api/time-sets/events?id=${ids.slice(0, 2).join(',')}`)
                expect(byIds.body.total_count).toEqual(2)
            })
            it('reads an item on the nested and the flat route', async () => {
                const nested = await get(`/api/time-sets/${set}/events/${ids[0]}`)
                expect(nested.status).toEqual(200)
                expect(nested.body.id).toEqual(ids[0])
                const flat = await get(`/api/time-sets/events/${ids[0]}`)
                expect(flat.status).toEqual(200)
                expect(flat.body.id).toEqual(ids[0])
                expect(flat.body.freq).toEqual('daily')
            })
            it('returns 404 for an unknown event', async () => {
                expect((await get('/api/time-sets/events/999999999')).status).toEqual(404)
            })
            it('returns 404 when the path time set does not hold the event', async () => {
                expect((await get(`/api/time-sets/${setB}/events/${ids[0]}`)).status).toEqual(404)
            })
            it('expands time_set_id', async () => {
                const response = await get(`/api/time-sets/events/${ids[0]}?expand=time_set_id`)
                expect(response.status).toEqual(200)
                expect(response.body.time_set_id_expand.id).toEqual(response.body.time_set_id)
            })
        })

        describe('PUT', () => {
            let eventId: number

            it('replaces the event and resets the omitted fields', async () => {
                eventId = (await createEvent(setA, {...day('put'), freq: 'weekly', byday: 'MO', count: 3, wkst: 'SU'})).id
                const response = await send('put', `/api/time-sets/${setA}/events/${eventId}`, {start: '2031-05-05 10:00:00', comment: 'replaced'})
                expect(response.status).toEqual(200)
                const body = response.body as Record<string, unknown>
                expect([body.start, body.comment]).toEqual(['2031-05-05 10:00:00', 'replaced'])
                for (const field of ['end', 'freq', 'byday', 'count', 'wkst', 'duration'])
                    expect(body[field]).toBeNull()
            })
            it('keeps the time set without time_set_id', async () => {
                const response = await send('put', `/api/time-sets/events/${eventId}`, {start: '2031-05-05 10:00:00'})
                expect(response.status).toEqual(200)
                expect(response.body.time_set_id).toEqual(setA)
            })
            it('moves the event to another time set with time_set_id', async () => {
                const response = await send('put', `/api/time-sets/events/${eventId}`, {start: '2031-05-05 10:00:00', time_set_id: setA2})
                expect(response.status).toEqual(200)
                expect(response.body.time_set_id).toEqual(setA2)
                expect((await get(`/api/time-sets/${setA}/events/${eventId}`)).status).toEqual(404)
            })
            it('fails moving the event to an unknown time set', async () => {
                const response = await send('put', `/api/time-sets/events/${eventId}`, {start: '2031-05-05 10:00:00', time_set_id: 999999999})
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/time_set_id'])
            })
            it('fails an invalid event', async () => {
                const response = await send('put', `/api/time-sets/${setA2}/events/${eventId}`, {start: '2031-05-05 10:00:00', byday: 'MO'})
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/byday'])
            })
            it('returns 404 for an unknown event', async () => {
                expect((await send('put', '/api/time-sets/events/999999999', day('x'))).status).toEqual(404)
            })
            it('returns 404 when the path time set does not hold the event', async () => {
                expect((await send('put', `/api/time-sets/${setB}/events/${eventId}`, day('x'))).status).toEqual(404)
            })
            it('replaces many events', async () => {
                const second = (await createEvent(setA2, day('second'))).id
                const response = await send('put', '/api/time-sets/events', {
                    [eventId]: {start: '2031-05-06 10:00:00', comment: 'many1'},
                    [second]: {start: '2031-05-07 10:00:00', comment: 'many2'},
                })
                expect(response.status).toEqual(200)
                expect((response.body.data as number[]).sort()).toEqual([eventId, second].sort())
                expect((await get(`/api/time-sets/events/${second}`)).body.comment).toEqual('many2')
            })
            it('points to the event moved to an unknown time set in a bulk PUT', async () => {
                const response = await send('put', '/api/time-sets/events', {
                    [eventId]: {start: '2031-05-06 10:00:00', time_set_id: 999999999},
                })
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual([`/${eventId}/time_set_id`])
            })
        })

        describe('PATCH', () => {
            let eventId: number

            it('patches fields of the event', async () => {
                eventId = (await createEvent(setA, {...day('patch'), freq: 'weekly', byday: 'MO,WE'})).id
                const response = await patch(`/api/time-sets/${setA}/events/${eventId}`, [
                    {op: 'replace', path: '/byday', value: 'TU'},
                    {op: 'replace', path: '/comment', value: 'patched'},
                    {op: 'add', path: '/count', value: 5},
                ])
                expect(response.status).toEqual(200)
                expect([response.body.byday, response.body.comment, response.body.count]).toEqual(['TU', 'patched', 5])
            })
            it('removes a field', async () => {
                const response = await patch(`/api/time-sets/events/${eventId}`, [{op: 'remove', path: '/count'}])
                expect(response.status).toEqual(200)
                expect(response.body.count).toBeNull()
            })
            it('fails removing freq while recurrence fields remain', async () => {
                const response = await patch(`/api/time-sets/events/${eventId}`, [{op: 'remove', path: '/freq'}])
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/byday'])
            })
            it('removes freq together with the recurrence fields', async () => {
                const response = await patch(`/api/time-sets/events/${eventId}`, [
                    {op: 'remove', path: '/freq'},
                    {op: 'remove', path: '/byday'},
                ])
                expect(response.status).toEqual(200)
                expect([response.body.freq, response.body.byday]).toEqual([null, null])
            })
            it('fails a duration while the event has an end', async () => {
                const response = await patch(`/api/time-sets/events/${eventId}`, [{op: 'add', path: '/duration', value: 'PT1H'}])
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/duration'])
            })
            it('fails an end before the stored start', async () => {
                const response = await patch(`/api/time-sets/events/${eventId}`, [{op: 'replace', path: '/end', value: '2031-03-03 07:00:00'}])
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/end'])
            })
            it('fails an invalid value', async () => {
                const response = await patch(`/api/time-sets/events/${eventId}`, [{op: 'replace', path: '/start', value: 'garbage'}])
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/start'])
            })
            it('moves the event to another time set', async () => {
                const response = await patch(`/api/time-sets/events/${eventId}`, [{op: 'replace', path: '/time_set_id', value: setA2}])
                expect(response.status).toEqual(200)
                expect(response.body.time_set_id).toEqual(setA2)
            })
            it('returns 404 when the path time set does not hold the event', async () => {
                expect((await patch(`/api/time-sets/${setB}/events/${eventId}`, [{op: 'replace', path: '/comment', value: 'x'}])).status).toEqual(404)
            })
            it('patches many events', async () => {
                const other = (await createEvent(setA2, day('other'))).id
                const response = await patch('/api/time-sets/events', {
                    [eventId]: [{op: 'replace', path: '/comment', value: 'bulk1'}],
                    [other]: [{op: 'replace', path: '/comment', value: 'bulk2'}],
                })
                expect(response.status).toEqual(200)
                expect((await get(`/api/time-sets/events/${eventId}`)).body.comment).toEqual('bulk1')
                expect((await get(`/api/time-sets/events/${other}`)).body.comment).toEqual('bulk2')
            })
        })

        describe('as reseller', () => {
            let ownEvent: number
            let foreignEvent: number

            it('creates and reads events of an own time set', async () => {
                ownEvent = (await createEvent(setA, day('own'), 'reseller')).id
                const response = await get(`/api/time-sets/${setA}/events/${ownEvent}`, 'reseller')
                expect(response.status).toEqual(200)
            })
            it('lists only events of own time sets', async () => {
                foreignEvent = (await createEvent(setB, day('foreign'))).id
                const response = await get('/api/time-sets/events?rows=100', 'reseller')
                expect(response.status).toEqual(200)
                const events = response.body.data as EventBody[]
                expect(events.map(e => e.id)).toContain(ownEvent)
                expect(events.map(e => e.id)).not.toContain(foreignEvent)
            })
            it('does not find an event of another reseller', async () => {
                expect((await get(`/api/time-sets/events/${foreignEvent}`, 'reseller')).status).toEqual(404)
                expect((await get(`/api/time-sets/${setB}/events/${foreignEvent}`, 'reseller')).status).toEqual(404)
                expect((await send('put', `/api/time-sets/events/${foreignEvent}`, day('x'), 'reseller')).status).toEqual(404)
                expect((await patch(`/api/time-sets/events/${foreignEvent}`, [{op: 'replace', path: '/comment', value: 'x'}], 'reseller')).status).toEqual(404)
                expect((await send('delete', `/api/time-sets/events/${foreignEvent}`, {}, 'reseller')).status).toEqual(404)
            })
            it('fails creating an event in a time set of another reseller', async () => {
                const response = await send('post', `/api/time-sets/${setB}/events`, day('x'), 'reseller')
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/time_set_id'])
            })
            it('fails moving an event to a time set of another reseller', async () => {
                const response = await send('put', `/api/time-sets/events/${ownEvent}`, {...day('own'), time_set_id: setB}, 'reseller')
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/time_set_id'])
            })
            it('deletes an own event', async () => {
                expect((await send('delete', `/api/time-sets/${setA}/events/${ownEvent}`, {}, 'reseller')).status).toEqual(204)
            })
        })

        describe('as ccare and lintercept', () => {
            const calls: [string, string, string, object | undefined][] = [
                ['list events', 'get', '/api/time-sets/events', undefined],
                ['list events of a set', 'get', '/api/time-sets/1/events', undefined],
                ['read an event', 'get', '/api/time-sets/events/1', undefined],
                ['create an event', 'post', '/api/time-sets/1/events', {start: '2031-03-03 08:00:00'}],
                ['update an event', 'put', '/api/time-sets/events/1', {start: '2031-03-03 08:00:00'}],
                ['patch an event', 'patch', '/api/time-sets/events/1', [{op: 'replace', path: '/comment', value: 'x'}]],
                ['delete an event', 'delete', '/api/time-sets/events/1', undefined],
            ]
            describe.each(['ccare', 'lintercept'])('as %s', role => {
                it.each(calls)('fails to %s with 403', async (_label, method, url, body) => {
                    const req = as(role, request(app.getHttpServer())[method](url))
                    const response = body
                        ? await req.set('Content-Type', method == 'patch' ? 'application/json-patch+json' : 'application/json').send(body)
                        : await req
                    expect(response.status).toEqual(403)
                })
            })
        })

        describe('DELETE', () => {
            it('deletes an event on the nested route', async () => {
                const id = (await createEvent(setA, day('del1'))).id
                expect((await send('delete', `/api/time-sets/${setA}/events/${id}`, {})).status).toEqual(204)
                expect((await get(`/api/time-sets/events/${id}`)).status).toEqual(404)
            })
            it('deletes an event on the flat route', async () => {
                const id = (await createEvent(setA, day('del2'))).id
                expect((await send('delete', `/api/time-sets/events/${id}`, {})).status).toEqual(204)
            })
            it('deletes many events', async () => {
                const first = (await createEvent(setA, day('del3'))).id
                const second = (await createEvent(setA2, day('del4'))).id
                expect((await send('delete', '/api/time-sets/events', [first, second])).status).toEqual(204)
                expect((await get(`/api/time-sets/events/${first}`)).status).toEqual(404)
                expect((await get(`/api/time-sets/events/${second}`)).status).toEqual(404)
            })
            it('fails many events with an unknown id and keeps the others', async () => {
                const id = (await createEvent(setA, day('del5'))).id
                const response = await send('delete', '/api/time-sets/events', [id, 999999999])
                expect(response.status).toEqual(422)
                expect(pointers(response)).toEqual(['/1'])
                expect((await get(`/api/time-sets/events/${id}`)).status).toEqual(200)
            })
            it('fails the path time set not holding the event', async () => {
                const id = (await createEvent(setA, day('del6'))).id
                expect((await send('delete', `/api/time-sets/${setB}/events/${id}`, {})).status).toEqual(404)
            })
            it('returns 404 for an unknown event', async () => {
                expect((await send('delete', '/api/time-sets/events/999999999', {})).status).toEqual(404)
            })
        })

        describe('journals', () => {
            it('journals the writes of an event', async () => {
                const created = await createEvent(setA, day('journal'))
                expect((await send('put', `/api/time-sets/events/${created.id}`, day('journal2'))).status).toEqual(200)
                const journals = await db.billing.Journal.find({
                    where: {resource_name: 'time-sets/events', resource_id: created.id, username: adminCreds.username, timestamp: MoreThanOrEqual(startedAt)},
                    order: {id: 'ASC'},
                })
                expect(journals.map(j => j.operation)).toEqual(['create', 'update'])
                const response = await get(`/api/time-sets/events/${created.id}/journal`)
                expect(response.status).toEqual(200)
                expect(response.body.total_count).toEqual(2)
            })
        })
    })

    describe('Time Set Event DELETE', () => {
        it('deletes the time sets with their events', async () => {
            for (const id of setIds)
                expect((await send('delete', `/api/time-sets/${id}`, {})).status).toEqual(204)
        })
        it('deletes the fixtures', async () => {
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
