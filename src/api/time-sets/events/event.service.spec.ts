import {NotFoundException} from '@nestjs/common'
import {Test, TestingModule} from '@nestjs/testing'

import {TimeSetEventModule} from './event.module'
import {TimeSetEventService} from './event.service'
import {TimeSetEventMariadbRepository} from './repositories/event.mariadb.repository'
import {TimeSetEventMockRepository} from './repositories/event.mock.repository'

import {TimeSetMariadbRepository} from '~/api/time-sets/repositories/time-set.mariadb.repository'
import {TimeSetMockRepository} from '~/api/time-sets/repositories/time-set.mock.repository'
import {AppModule} from '~/app.module'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {internal} from '~/entities'
import {TimeSetEventFreq} from '~/entities/internal/time-set-event.internal.entity'
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

function makeEvent(timeSetId: number, fields: Partial<internal.TimeSetEvent> = {}): internal.TimeSetEvent {
    return Object.assign(new internal.TimeSetEvent(), {timeSetId, start: new Date('2026-03-01 08:00:00')}, fields)
}

// mock fixtures: time sets 1 (reseller 1) and 3 (reseller 1) and 2 (reseller 2); events 1, 2 in set 1, event 3 in set 2
describe('TimeSetEventService', () => {
    let service: TimeSetEventService
    let eventRepo: TimeSetEventMockRepository

    const makeSr = (body: unknown, srUser: AuthResponseDto = user, params: Record<string, string> = {}): ServiceRequest => ({
        returnContent: true,
        headers: [undefined],
        params,
        query: {},
        user: srUser,
        req: {method: 'POST', body, params} as never,
    })

    const failure = async (promise: Promise<unknown>): Promise<ApiErrorException> => {
        const err = await promise.catch((e: unknown) => e)
        expect(err).toBeInstanceOf(ApiErrorException)
        return err as ApiErrorException
    }

    const errorEntries = (err: ApiErrorException): [string, string][] =>
        err.errorList.map(entry => [entry.pointer, entry.code])

    beforeEach(async () => {
        eventRepo = new TimeSetEventMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [AppModule, TimeSetEventModule],
        })
            .overrideProvider(TimeSetEventMariadbRepository).useValue(eventRepo)
            .overrideProvider(TimeSetMariadbRepository).useValue(new TimeSetMockRepository())
            .compile()
        service = module.get<TimeSetEventService>(TimeSetEventService)
    })

    describe('scope', () => {
        it('readAll passes the reseller and the path time set as filter', async () => {
            const spy = jest.spyOn(eventRepo, 'readAll')
            const sr = makeSr(undefined, resellerUser, {timeSetId: '1'})
            const [events, count] = await service.readAll(sr)
            expect(spy).toHaveBeenCalledWith(sr, {resellerId: 1, timeSetId: 1})
            expect(events.map(event => event.id)).toStrictEqual([1, 2])
            expect(count).toEqual(2)
        })

        it('readAll returns the events of every reseller to admin roles', async () => {
            const [events] = await service.readAll(makeSr(undefined))
            expect(events.map(event => event.id)).toStrictEqual([1, 2, 3])
        })

        it('read throws NotFoundException for an event of another reseller', async () => {
            await expect(service.read(3, makeSr(undefined, resellerUser, {id: '3'}))).rejects.toThrow(NotFoundException)
        })

        it('read throws NotFoundException if the event is not in the time set of the path', async () => {
            await expect(service.read(3, makeSr(undefined, user, {timeSetId: '1', id: '3'}))).rejects.toThrow(NotFoundException)
            await expect(service.read(3, makeSr(undefined, user, {timeSetId: '2', id: '3'}))).resolves.toMatchObject({id: 3})
        })

        it('update and delete report events out of scope as missing', async () => {
            const updateSpy = jest.spyOn(eventRepo, 'update')
            const deleteSpy = jest.spyOn(eventRepo, 'delete')
            const updates = new Dictionary<internal.TimeSetEvent>('3', makeEvent(2, {id: 3}))
            const sr = makeSr(undefined, resellerUser, {id: '3'})
            await expect(service.update(updates, sr)).rejects.toThrow(NotFoundException)
            await expect(service.delete([3], sr)).rejects.toThrow(NotFoundException)
            await expect(service.delete([1, 3], makeSr([1, 3], resellerUser))).rejects.toThrow(ApiErrorException)
            expect(updateSpy).not.toHaveBeenCalled()
            expect(deleteSpy).not.toHaveBeenCalled()
        })
    })

    describe('create', () => {
        it('creates the events and returns them in request order', async () => {
            const created = await service.create([makeEvent(2, {comment: 'a'}), makeEvent(1, {comment: 'b'})], makeSr([]))
            expect(created.map(event => [event.timeSetId, event.comment])).toStrictEqual([[2, 'a'], [1, 'b']])
        })

        it('creates nothing for no events', async () => {
            await expect(service.create([], makeSr([]))).resolves.toStrictEqual([])
        })

        it('rejects an unknown time set with a pointer', async () => {
            const sr = makeSr([{}, {}])
            const err = await failure(service.create([makeEvent(1), makeEvent(99)], sr))
            expect(errorEntries(err)).toStrictEqual([['/1/time_set_id', 'ENTRY_NOT_FOUND']])
        })

        it('rejects recurrence fields without freq with a pointer', async () => {
            const sr = makeSr([{}, {}])
            const err = await failure(service.create([makeEvent(1, {freq: TimeSetEventFreq.Daily, interval: 2}), makeEvent(1, {byday: 'MO'})], sr))
            expect(errorEntries(err)).toStrictEqual([['/1/byday', 'EVENT_REQUIRES_FREQ']])
        })

        it('rejects an event without a time set', async () => {
            const err = await failure(service.create([makeEvent(undefined)], makeSr({})))
            expect(errorEntries(err)).toStrictEqual([['/time_set_id', 'ENTRY_NOT_FOUND']])
        })

        it('rejects the time set of another reseller for reseller roles', async () => {
            const sr = makeSr([{}, {}], resellerUser)
            const err = await failure(service.create([makeEvent(1), makeEvent(2)], sr))
            expect(errorEntries(err)).toStrictEqual([['/1/time_set_id', 'ENTRY_NOT_FOUND']])
        })

        it('rejects an unknown time set of the path', async () => {
            const sr = makeSr({}, user, {timeSetId: '99'})
            const err = await failure(service.create([makeEvent(99)], sr))
            expect(errorEntries(err)).toStrictEqual([['/time_set_id', 'ENTRY_NOT_FOUND']])
        })
    })

    describe('update', () => {
        it('keeps the stored time set if the update has none', async () => {
            const updates = new Dictionary<internal.TimeSetEvent>('1', makeEvent(null, {id: 1, comment: 'changed'}))
            await service.update(updates, makeSr(undefined, user, {id: '1'}))
            expect(await eventRepo.readById(1, undefined)).toMatchObject({timeSetId: 1, comment: 'changed'})
        })

        it('updates an event through the path of its time set', async () => {
            const updates = new Dictionary<internal.TimeSetEvent>('1', makeEvent(1, {id: 1, comment: 'nested'}))
            await service.update(updates, makeSr(undefined, user, {timeSetId: '1', id: '1'}))
            expect(await eventRepo.readById(1, undefined)).toMatchObject({comment: 'nested'})
        })

        it('moves an event to a time set in scope', async () => {
            const updates = new Dictionary<internal.TimeSetEvent>('1', makeEvent(3, {id: 1}))
            await service.update(updates, makeSr(undefined, resellerUser, {id: '1'}))
            expect(await eventRepo.readById(1, undefined)).toMatchObject({timeSetId: 3})
        })

        it('rejects moving an event to a time set of another reseller', async () => {
            const updates = new Dictionary<internal.TimeSetEvent>('1', makeEvent(2, {id: 1}))
            const err = await failure(service.update(updates, makeSr(undefined, resellerUser, {id: '1'})))
            expect(errorEntries(err)).toStrictEqual([['/time_set_id', 'ENTRY_NOT_FOUND']])
        })

        it('points to the moved event of a bulk update', async () => {
            const updates = new Dictionary<internal.TimeSetEvent>()
            updates['1'] = makeEvent(1, {id: 1})
            updates['2'] = makeEvent(2, {id: 2})
            const err = await failure(service.update(updates, makeSr(updates, resellerUser)))
            expect(errorEntries(err)).toStrictEqual([['/2/time_set_id', 'ENTRY_NOT_FOUND']])
        })

        it('checks the rules between the fields on the updated event', async () => {
            const updates = new Dictionary<internal.TimeSetEvent>()
            updates['1'] = makeEvent(1, {id: 1, freq: TimeSetEventFreq.Daily, count: 3, until: new Date('2027-01-01 00:00:00')})
            updates['2'] = makeEvent(1, {id: 2, interval: 2})
            const err = await failure(service.update(updates, makeSr(updates)))
            expect(errorEntries(err)).toStrictEqual([
                ['/1/count', 'EVENT_UNTIL_AND_COUNT'],
                ['/2/interval', 'EVENT_REQUIRES_FREQ'],
            ])
        })

        it('reports unknown ids of a bulk update', async () => {
            const updates = new Dictionary<internal.TimeSetEvent>()
            updates['1'] = makeEvent(1, {id: 1})
            updates['100'] = makeEvent(1, {id: 100})
            const err = await failure(service.update(updates, makeSr(updates)))
            expect(errorEntries(err)).toStrictEqual([['/100', 'ENTRY_NOT_FOUND']])
        })
    })

    describe('delete', () => {
        it('returns the deleted ids', async () => {
            await expect(service.delete([1, 2], makeSr([1, 2]))).resolves.toStrictEqual([1, 2])
            await expect(service.read(1, makeSr(undefined))).rejects.toThrow(NotFoundException)
        })
    })

    describe('deleteByTimeSetIds', () => {
        it('deletes the events of the time sets', async () => {
            await service.deleteByTimeSetIds([1])
            const [events] = await eventRepo.readAll(undefined)
            expect(events.map(event => event.id)).toStrictEqual([3])
        })
    })
})
