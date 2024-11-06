import {NotFoundException} from '@nestjs/common'

import {RewriteRuleSetRepository} from '~/api/rewrite-rules/sets/interfaces/rewrite-rule-set.repository'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

interface RewriteRuleSetMockDB {
    [key: number]: internal.RewriteRuleSet
}

export class RewriteRuleSetMockRepository implements RewriteRuleSetRepository {

    private readonly db: RewriteRuleSetMockDB
    private nextId: number

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
        return Promise.resolve(ids)
    }

    async readAll(_sr: ServiceRequest): Promise<[internal.RewriteRuleSet[], number]> {
        const sets: [internal.RewriteRuleSet[], number] =
            [Object.keys(this.db).map(id => this.db[id] as internal.RewriteRuleSet), Object.keys(this.db).length]
        return Promise.resolve(sets)
    }

    async readByDomain(_domain: string, _sr: ServiceRequest): Promise<internal.RewriteRuleSet> {
        return Promise.resolve(undefined as unknown as internal.RewriteRuleSet)
    }

    async readById(id: number, _sr: ServiceRequest): Promise<internal.RewriteRuleSet> {
        this.throwErrorIfIdNotExists(id)
        return Promise.resolve(this.db[id])
    }

    async readWhereInIds(ids: number[], sr: ServiceRequest): Promise<internal.RewriteRuleSet[]> {
        const sets: internal.RewriteRuleSet[] = []
        for (const id of ids) {
            sets.push(await this.readById(id, sr))
        }
        return Promise.resolve(sets)
    }

    private throwErrorIfIdNotExists(id: number): void {
        if (this.db[id] == undefined)
            throw new NotFoundException()
    }

}
