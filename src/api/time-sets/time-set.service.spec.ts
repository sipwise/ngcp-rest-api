import {NotFoundException} from '@nestjs/common'
import {Test, TestingModule} from '@nestjs/testing'

import {TimeSetMariadbRepository} from './repositories/time-set.mariadb.repository'
import {TimeSetMockRepository} from './repositories/time-set.mock.repository'
import {TimeSetModule} from './time-set.module'
import {TimeSetService} from './time-set.service'

import {AppModule} from '~/app.module'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ApiErrorException} from '~/helpers/errors.helper'
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

const resellerUser: AuthResponseDto = {...user, role: 'reseller', reseller_id: 1, reseller_id_required: true}

function makeTimeSet(name: string, resellerId?: number, id?: number): internal.TimeSet {
    const timeSet = new internal.TimeSet()
    timeSet.id = id
    timeSet.name = name
    timeSet.resellerId = resellerId
    return timeSet
}

describe('TimeSetService', () => {
    let service: TimeSetService
    let repo: TimeSetMockRepository

    const makeSr = (body: unknown, srUser: AuthResponseDto = user, params: Record<string, string> = {}, method = 'POST'): ServiceRequest => ({
        returnContent: true,
        headers: [undefined],
        params,
        query: {},
        user: srUser,
        req: {method, body, params} as never,
    })

    const failure = async (promise: Promise<unknown>): Promise<ApiErrorException> => {
        const err = await promise.catch((e: unknown) => e)
        expect(err).toBeInstanceOf(ApiErrorException)
        return err as ApiErrorException
    }

    const errorEntries = (err: ApiErrorException): [string, string][] =>
        err.errorList.map(entry => [entry.pointer, entry.code])

    beforeEach(async () => {
        repo = new TimeSetMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [AppModule, TimeSetModule],
        })
            .overrideProvider(TimeSetMariadbRepository).useValue(repo)
            .compile()
        service = module.get<TimeSetService>(TimeSetService)
    })

    describe('scope', () => {
        it('readAll passes the reseller filter of reseller roles', async () => {
            const spy = jest.spyOn(repo, 'readAll')
            const sr = makeSr(undefined, resellerUser)
            const [timeSets, count] = await service.readAll(sr)
            expect(spy).toHaveBeenCalledWith(sr, {resellerId: 1})
            expect(timeSets.map(timeSet => timeSet.id)).toStrictEqual([1, 3])
            expect(count).toEqual(2)
        })

        it('readAll returns every time set to admin roles', async () => {
            const spy = jest.spyOn(repo, 'readAll')
            const sr = makeSr(undefined)
            const [timeSets] = await service.readAll(sr)
            expect(spy).toHaveBeenCalledWith(sr, {})
            expect(timeSets).toHaveLength(4)
        })

        it('read throws NotFoundException for a time set of another reseller', async () => {
            await expect(service.read(2, makeSr(undefined, resellerUser))).rejects.toThrow(NotFoundException)
        })

        it('update and delete report time sets of another reseller as missing', async () => {
            const updateSpy = jest.spyOn(repo, 'update')
            const deleteSpy = jest.spyOn(repo, 'delete')
            const sr = makeSr(undefined, resellerUser)
            const updates = new Dictionary<internal.TimeSet>('2', makeTimeSet('other', 1, 2))
            await expect(service.update(updates, sr)).rejects.toThrow(ApiErrorException)
            await expect(service.delete([2], sr)).rejects.toThrow(ApiErrorException)
            expect(updateSpy).not.toHaveBeenCalled()
            expect(deleteSpy).not.toHaveBeenCalled()
        })
    })

    describe('readCalendar', () => {
        it('returns the calendar of the time set', async () => {
            const {timeSet, ical} = await service.readCalendar(1, makeSr(undefined))
            expect(timeSet.id).toEqual(1)
            expect(ical).toEqual('BEGIN:VCALENDAR\nEND:VCALENDAR\n')
        })

        it('returns a calendar without events for a time set without events', async () => {
            const {ical} = await service.readCalendar(3, makeSr(undefined))
            expect(ical).toEqual([
                'BEGIN:VCALENDAR',
                'PRODID:-//Mozilla.org/NONSGML Mozilla Calendar V1.1//EN',
                'NAME:timeset3',
                'VERSION:2.0',
                'END:VCALENDAR',
                '',
            ].join('\n'))
        })

        it('throws NotFoundException for a time set of another reseller', async () => {
            await expect(service.readCalendar(2, makeSr(undefined, resellerUser))).rejects.toThrow(NotFoundException)
        })
    })

    describe('create', () => {
        it('keeps the reseller of admin roles', async () => {
            const [created] = await service.create([makeTimeSet('new', 3)], makeSr([]))
            expect(created.resellerId).toEqual(3)
        })

        it('forces the reseller of reseller roles', async () => {
            const created = await service.create([makeTimeSet('a', 3), makeTimeSet('b')], makeSr([], resellerUser))
            expect(created.map(timeSet => timeSet.resellerId)).toStrictEqual([1, 1])
        })

        it('returns the time sets in request order', async () => {
            const created = await service.create([makeTimeSet('b', 1), makeTimeSet('a', 1)], makeSr([]))
            expect(created.map(timeSet => timeSet.name)).toStrictEqual(['b', 'a'])
        })

        it('rejects an unknown reseller with a pointer', async () => {
            const sr = makeSr([{}, {}])
            const err = await failure(service.create([makeTimeSet('a', 1), makeTimeSet('b', 99)], sr))
            expect(errorEntries(err)).toStrictEqual([['/1/reseller_id', 'RESELLER_ID_INVALID']])
        })

        it('rejects names of other time sets, case-insensitively', async () => {
            const sr = makeSr([{}, {}])
            const err = await failure(service.create([makeTimeSet('free', 1), makeTimeSet('TIMESET2', 1)], sr))
            expect(errorEntries(err)).toStrictEqual([['/1/name', 'TIME_SET_NAME_EXISTS']])
        })

        it('rejects a name repeated in the request', async () => {
            const sr = makeSr([{}, {}, {}])
            const err = await failure(service.create([makeTimeSet('same', 1), makeTimeSet('other', 1), makeTimeSet('Same', 1)], sr))
            expect(errorEntries(err)).toStrictEqual([['/2/name', 'TIME_SET_NAME_EXISTS']])
        })
    })

    describe('update', () => {
        it('keeps the own name', async () => {
            const updates = new Dictionary<internal.TimeSet>('1', makeTimeSet('timeset1', 1, 1))
            await service.update(updates, makeSr(undefined, user, {id: '1'}))
            expect((await service.read(1, makeSr(undefined))).name).toEqual('timeset1')
        })

        it('rejects the name of another time set', async () => {
            const updates = new Dictionary<internal.TimeSet>('1', makeTimeSet('timeset2', 1, 1))
            const err = await failure(service.update(updates, makeSr(undefined, user, {id: '1'})))
            expect(errorEntries(err)).toStrictEqual([['/name', 'TIME_SET_NAME_EXISTS']])
        })

        it('forces the reseller of reseller roles', async () => {
            const updates = new Dictionary<internal.TimeSet>('1', makeTimeSet('renamed', null, 1))
            await service.update(updates, makeSr(undefined, resellerUser, {id: '1'}))
            expect((await service.read(1, makeSr(undefined))).resellerId).toEqual(1)
        })

        it('reports unknown ids of a bulk update', async () => {
            const updates = new Dictionary<internal.TimeSet>()
            updates['1'] = makeTimeSet('a', 1, 1)
            updates['100'] = makeTimeSet('b', 1, 100)
            const err = await failure(service.update(updates, makeSr(updates)))
            expect(errorEntries(err)).toStrictEqual([['/100', 'ENTRY_NOT_FOUND']])
        })
    })

    describe('delete', () => {
        it('returns the deleted ids', async () => {
            await expect(service.delete([1, 2], makeSr([1, 2]))).resolves.toStrictEqual([1, 2])
            await expect(service.read(1, makeSr(undefined))).rejects.toThrow(NotFoundException)
        })

        it('rejects a time set used by a peering group or an NCOS level and deletes nothing', async () => {
            const spy = jest.spyOn(repo, 'delete')
            const err = await failure(service.delete([1, 3], makeSr([1, 3], user, {}, 'DELETE')))
            expect(err.getStatus()).toEqual(422)
            expect(errorEntries(err)).toStrictEqual([['/1', 'TIME_SET_IN_USE']])
            expect(spy).not.toHaveBeenCalled()
        })
    })
})
