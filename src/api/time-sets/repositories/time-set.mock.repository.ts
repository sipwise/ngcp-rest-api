import {NotFoundException} from '@nestjs/common'

import {FilterBy, TimeSetRepository} from '~/api/time-sets/interfaces/time-set.repository'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export class TimeSetMockRepository implements TimeSetRepository {
    private readonly db: Record<number, internal.TimeSet>
    // time sets a peering group or an NCOS level refers to
    private readonly usedIds = new Set([3])
    private readonly icals: Record<number, string> = {1: 'BEGIN:VCALENDAR\nEND:VCALENDAR\n'}
    private readonly resellerIds = new Set([1, 2, 3])
    private nextId: number

    constructor() {
        this.db = {
            1: {id: 1, resellerId: 1, name: 'timeset1'},
            2: {id: 2, resellerId: 2, name: 'timeset2'},
            3: {id: 3, resellerId: 1, name: 'timeset3'},
            4: {id: 4, resellerId: 3, name: 'timeset4'},
        }
        this.nextId = Object.keys(this.db).length + 1
    }

    create(entities: internal.TimeSet[], _sr: ServiceRequest): Promise<number[]> {
        const ids: number[] = []
        for (const entity of entities) {
            entity.id = this.nextId++
            ids.push(entity.id)
            this.db[entity.id] = entity
        }
        return Promise.resolve(ids)
    }

    readAll(_sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.TimeSet[], number]> {
        const sets = Object.values(this.db).filter(set => this.matches(set, filterBy))
        return Promise.resolve([sets, sets.length])
    }

    readById(id: number, _sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.TimeSet> {
        this.throwErrorIfIdNotExists(id)
        if (!this.matches(this.db[id], filterBy))
            throw new NotFoundException()
        return Promise.resolve(this.db[id])
    }

    readWhereInIds(ids: number[], _sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.TimeSet[]> {
        return Promise.resolve(ids.filter(id => this.db[id] != undefined && this.matches(this.db[id], filterBy)).map(id => this.db[id]))
    }

    readIcal(id: number): Promise<string | null> {
        return Promise.resolve(this.icals[id] ?? null)
    }

    readExistingResellerIds(ids: number[]): Promise<number[]> {
        return Promise.resolve(ids.filter(id => this.resellerIds.has(id)))
    }

    readNameConflicts(names: string[], excludeIds: number[]): Promise<internal.TimeSet[]> {
        const lowerNames = names.map(name => name.toLowerCase())
        return Promise.resolve(Object.values(this.db).filter(set => !excludeIds.includes(set.id) && lowerNames.includes(set.name.toLowerCase())))
    }

    readUsedIds(ids: number[]): Promise<number[]> {
        return Promise.resolve(ids.filter(id => this.usedIds.has(id)))
    }

    update(updates: Dictionary<internal.TimeSet>, _sr: ServiceRequest): Promise<number[]> {
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

    private matches(set: internal.TimeSet, filterBy?: FilterBy): boolean {
        return filterBy?.resellerId === undefined || set.resellerId == filterBy.resellerId
    }

    private throwErrorIfIdNotExists(id: number): void {
        if (this.db[id] == undefined)
            throw new NotFoundException()
    }
}
