import {NotFoundException} from '@nestjs/common'

import {FilterBy, TimeSetEventRepository} from '~/api/time-sets/events/interfaces/event.repository'
import {internal} from '~/entities'
import {TimeSetEventFreq} from '~/entities/internal/time-set-event.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export class TimeSetEventMockRepository implements TimeSetEventRepository {
    private readonly db: Record<number, internal.TimeSetEvent>
    // reseller of each time set, as in the time set mock repository
    private readonly setResellers: Record<number, number> = {1: 1, 2: 2, 3: 1, 4: 3}
    private nextId: number

    constructor() {
        this.db = {
            1: {
                id: 1,
                timeSetId: 1,
                start: new Date('2026-01-05 09:00:00'),
                end: new Date('2026-01-05 17:00:00'),
                freq: TimeSetEventFreq.Weekly,
                byday: 'MO,TU,WE,TH,FR',
                comment: 'office hours',
            },
            2: {
                id: 2,
                timeSetId: 1,
                start: new Date('2026-12-24 00:00:00'),
                comment: 'holiday',
            },
            3: {
                id: 3,
                timeSetId: 2,
                start: new Date('2026-06-01 08:00:00'),
                duration: 'PT2H',
            },
        }
        this.nextId = Object.keys(this.db).length + 1
    }

    create(entities: internal.TimeSetEvent[], _sr: ServiceRequest): Promise<number[]> {
        const ids: number[] = []
        for (const entity of entities) {
            entity.id = this.nextId++
            ids.push(entity.id)
            this.db[entity.id] = entity
        }
        return Promise.resolve(ids)
    }

    readAll(_sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.TimeSetEvent[], number]> {
        const events = Object.values(this.db).filter(event => this.matches(event, filterBy))
        return Promise.resolve([events, events.length])
    }

    readById(id: number, _sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.TimeSetEvent> {
        this.throwErrorIfIdNotExists(id)
        if (!this.matches(this.db[id], filterBy))
            throw new NotFoundException()
        return Promise.resolve({...this.db[id]})
    }

    readWhereInIds(ids: number[], _sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.TimeSetEvent[]> {
        return Promise.resolve(ids
            .filter(id => this.db[id] != undefined && this.matches(this.db[id], filterBy))
            .map(id => ({...this.db[id]})))
    }

    update(updates: Dictionary<internal.TimeSetEvent>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            this.throwErrorIfIdNotExists(id)
            this.db[id] = updates[id]
        }
        return Promise.resolve(ids)
    }

    delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        for (const id of ids)
            this.throwErrorIfIdNotExists(id)
        for (const id of ids)
            delete this.db[id]
        return Promise.resolve(ids)
    }

    deleteByTimeSetIds(timeSetIds: number[]): Promise<void> {
        for (const event of Object.values(this.db)) {
            if (timeSetIds.includes(event.timeSetId))
                delete this.db[event.id]
        }
        return Promise.resolve()
    }

    private matches(event: internal.TimeSetEvent, filterBy?: FilterBy): boolean {
        return (filterBy?.timeSetId === undefined || event.timeSetId == filterBy.timeSetId)
            && (filterBy?.resellerId === undefined || this.setResellers[event.timeSetId] == filterBy.resellerId)
    }

    private throwErrorIfIdNotExists(id: number): void {
        if (this.db[id] == undefined)
            throw new NotFoundException()
    }
}
