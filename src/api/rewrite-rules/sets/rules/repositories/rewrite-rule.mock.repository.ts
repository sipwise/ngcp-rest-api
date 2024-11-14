import {NotFoundException} from '@nestjs/common'

import {RewriteRuleRepository} from '~/api/rewrite-rules/sets/rules/interfaces/rewrite-rule.repository'
import {internal} from '~/entities'
import {RewriteRuleDirection, RewriteRuleField} from '~/entities/internal/rewrite-rule.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

interface RewriteRuleMockDB {
    [key: number]: internal.RewriteRule
}

export class RewriteRuleMockRepository implements RewriteRuleRepository {

    private readonly db: RewriteRuleMockDB
    private nextId: number

    constructor() {
        this.db = {
            1: {
                id: 1,
                description: 'desc1',
                direction: RewriteRuleDirection.In,
                enabled: true,
                matchPattern: 'match1',
                replacePattern: 'replace1',
                field: RewriteRuleField.Callee,
                priority: 1,
                setId: 1,
            },
            2: {
                id: 2,
                description: 'desc2',
                direction: RewriteRuleDirection.In,
                enabled: true,
                matchPattern: 'match2',
                replacePattern: 'replace2',
                field: RewriteRuleField.Callee,
                priority: 2,
                setId: 1,
            },
            3: {
                id: 3,
                description: 'desc3',
                direction: RewriteRuleDirection.In,
                enabled: true,
                matchPattern: 'match3',
                replacePattern: 'replace3',
                field: RewriteRuleField.Callee,
                priority: 3,
                setId: 1,
            },
            4: {
                id: 4,
                description: 'desc4',
                direction: RewriteRuleDirection.In,
                enabled: true,
                matchPattern: 'match4',
                replacePattern: 'replace4',
                field: RewriteRuleField.Callee,
                priority: 4,
                setId: 1,
            },
        }
        this.nextId = Object.keys(this.db).length + 1
    }

    async create(sets: internal.RewriteRule[], _sr: ServiceRequest): Promise<number[]> {
        const ids: number[] = []
        for (const set of sets) {
            set.id = this.nextId
            ids.push(set.id)
            this.db[set.id] = set
            this.nextId++
        }
        return Promise.resolve(ids)
    }

    update(updates: Dictionary<internal.RewriteRule>, _sr: ServiceRequest): Promise<number[]> {
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

    async readAll(_sr: ServiceRequest): Promise<[internal.RewriteRule[], number]> {
        const sets: [internal.RewriteRule[], number] =
            [Object.keys(this.db).map(id => this.db[id] as internal.RewriteRule), Object.keys(this.db).length]
        return Promise.resolve(sets)
    }

    async readById(id: number, _sr: ServiceRequest): Promise<internal.RewriteRule> {
        this.throwErrorIfIdNotExists(id)
        return Promise.resolve(this.db[id])
    }

    async readWhereInIds(ids: number[], sr: ServiceRequest): Promise<internal.RewriteRule[]> {
        const sets: internal.RewriteRule[] = []
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
