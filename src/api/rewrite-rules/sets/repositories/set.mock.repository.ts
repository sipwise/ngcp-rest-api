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
    readonly createdRules: internal.RewriteRule[] = []

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

    async cleanSets(id: number, _sr: ServiceRequest): Promise<void> {
        this.cleaned.push(id)
        return Promise.resolve()
    }

    async createRules(rules: internal.RewriteRule[]): Promise<number[]> {
        this.createdRules.push(...rules)
        return Promise.resolve(rules.map((_r, i) => i + 1))
    }

    private matches(set: internal.RewriteRuleSet, filterBy?: FilterBy): boolean {
        return filterBy?.resellerId === undefined || set.resellerId == filterBy.resellerId
    }

    private throwErrorIfIdNotExists(id: number): void {
        if (this.db[id] == undefined)
            throw new NotFoundException()
    }

}
