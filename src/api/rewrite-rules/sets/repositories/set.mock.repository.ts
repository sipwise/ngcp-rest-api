import {NotFoundException} from '@nestjs/common'

import {RewriteRuleSetRepository} from '~/api/rewrite-rules/sets/interfaces/set.repository'
import {FilterBy} from '~/api/rewrite-rules/sets/repositories/set.mariadb.repository'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

interface RewriteRuleSetMockDB {
    [key: number]: internal.RewriteRuleSet
}

export class RewriteRuleSetMockRepository implements RewriteRuleSetRepository {

    private readonly db: RewriteRuleSetMockDB
    private nextId: number
    readonly cleaned: number[] = []
    // number of rules per set id, sets 3 and 4 have none
    private readonly ruleCounts = new Map([[1, 2], [2, 1]])

    constructor() {
        this.db = {
            1: {id: 1, resellerId: 1, name: 'rwrset1', description: 'desc1'},
            2: {id: 2, resellerId: 2, name: 'rwrset2', description: 'desc2'},
            3: {id: 3, resellerId: 3, name: 'rwrset3', description: 'desc3'},
            4: {id: 4, resellerId: 1, name: 'rwrset4', description: null},
        }
        this.nextId = Object.keys(this.db).length + 1
    }

    async create(sets: internal.RewriteRuleSet[], _sr: ServiceRequest): Promise<number[]> {
        const ids: number[] = []
        for (const set of sets) {
            set.id = this.nextId
            ids.push(set.id)
            this.db[set.id] = set
            this.nextId++
        }
        return Promise.resolve(ids)
    }

    update(updates: Dictionary<internal.RewriteRuleSet>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            this.throwErrorIfIdNotExists(id)
            this.db[id] = updates[id]
        }
        return Promise.resolve(ids)
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        for (const id of ids) {
            this.throwErrorIfIdNotExists(id)
        }
        for (const id of ids) {
            delete this.db[id]
        }
        return Promise.resolve(ids)
    }

    async readAll(_sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.RewriteRuleSet[], number]> {
        const sets = (Object.values(this.db) as internal.RewriteRuleSet[]).filter(set => this.matches(set, filterBy))
        return Promise.resolve([sets, sets.length])
    }

    async readById(id: number, _sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.RewriteRuleSet> {
        this.throwErrorIfIdNotExists(id)
        if (!this.matches(this.db[id], filterBy))
            throw new NotFoundException()
        return Promise.resolve(this.db[id])
    }

    async readWhereInIds(ids: number[], _sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.RewriteRuleSet[]> {
        return Promise.resolve(ids.filter(id => this.db[id] != undefined && this.matches(this.db[id], filterBy)).map(id => this.db[id]))
    }

    async hasRules(ids: number[]): Promise<boolean> {
        return Promise.resolve(ids.some(id => this.ruleCounts.get(id)))
    }

    async cleanSets(ids: number[], _sr: ServiceRequest): Promise<number> {
        this.cleaned.push(...ids)
        let deleted = 0
        for (const id of ids) {
            deleted += this.ruleCounts.get(id) ?? 0
            this.ruleCounts.delete(id)
        }
        return Promise.resolve(deleted)
    }

    private matches(set: internal.RewriteRuleSet, filterBy?: FilterBy): boolean {
        return filterBy?.resellerId === undefined || set.resellerId == filterBy.resellerId
    }

    private throwErrorIfIdNotExists(id: number): void {
        if (this.db[id] == undefined)
            throw new NotFoundException()
    }

}
