import {NotFoundException} from '@nestjs/common'

import {RewriteRuleRepository} from '~/api/rewrite-rules/sets/rules/interfaces/rule.repository'
import {FilterBy} from '~/api/rewrite-rules/sets/rules/repositories/rule.mariadb.repository'
import {internal} from '~/entities'
import {RewriteRuleDirection, RewriteRuleField, RewriteRuleMoveDirection} from '~/entities/internal/rewrite-rule.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

interface RewriteRuleMockDB {
    [key: string]: internal.RewriteRule
}

export class RewriteRuleMockRepository implements RewriteRuleRepository {

    private readonly db: RewriteRuleMockDB
    private readonly setResellers: Record<number, number> = {1: 1, 2: 1, 3: 1, 4: 1}
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
            5: {
                id: 5,
                description: 'desc5',
                direction: RewriteRuleDirection.Out,
                enabled: true,
                matchPattern: 'match5',
                replacePattern: 'replace5',
                field: RewriteRuleField.Callee,
                priority: 2,
                setId: 1,
            },
            6: {
                id: 6,
                description: 'desc6',
                direction: RewriteRuleDirection.In,
                enabled: true,
                matchPattern: 'match6',
                replacePattern: 'replace6',
                field: RewriteRuleField.Caller,
                priority: 2,
                setId: 1,
            },
            7: {
                id: 7,
                description: 'desc7',
                direction: RewriteRuleDirection.In,
                enabled: true,
                matchPattern: 'match7',
                replacePattern: 'replace7',
                field: RewriteRuleField.Callee,
                priority: 5,
                setId: 2,
            },
            8: {
                id: 8,
                description: 'desc8',
                direction: RewriteRuleDirection.In,
                enabled: true,
                matchPattern: 'match8',
                replacePattern: 'replace8',
                field: RewriteRuleField.Callee,
                priority: 5,
                setId: 2,
            },
            9: {
                id: 9,
                description: 'desc9',
                direction: RewriteRuleDirection.In,
                enabled: true,
                matchPattern: 'match9',
                replacePattern: 'replace9',
                field: RewriteRuleField.Callee,
                priority: 0,
                setId: 3,
            },
            10: {
                id: 10,
                description: 'desc10',
                direction: RewriteRuleDirection.In,
                enabled: true,
                matchPattern: 'match10',
                replacePattern: 'replace10',
                field: RewriteRuleField.Callee,
                priority: 0,
                setId: 3,
            },
            11: {
                id: 11,
                description: 'desc11',
                direction: RewriteRuleDirection.In,
                enabled: true,
                matchPattern: 'match11',
                replacePattern: 'replace11',
                field: RewriteRuleField.Callee,
                priority: 4,
                setId: 4,
            },
            12: {
                id: 12,
                description: 'desc12',
                direction: RewriteRuleDirection.In,
                enabled: true,
                matchPattern: 'match12',
                replacePattern: 'replace12',
                field: RewriteRuleField.Callee,
                priority: 5,
                setId: 4,
            },
            13: {
                id: 13,
                description: 'desc13',
                direction: RewriteRuleDirection.In,
                enabled: true,
                matchPattern: 'match13',
                replacePattern: 'replace13',
                field: RewriteRuleField.Callee,
                priority: 5,
                setId: 4,
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

    async readById(id: number, _sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.RewriteRule> {
        this.throwErrorIfIdNotExists(id)
        const rule = this.db[id]
        if ((filterBy?.setId && rule.setId != filterBy.setId)
            || (filterBy?.resellerId && this.setResellers[rule.setId] != filterBy.resellerId))
            throw new NotFoundException()
        return Promise.resolve({...rule})
    }

    async readWhereInIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.RewriteRule[]> {
        const sets: internal.RewriteRule[] = []
        for (const id of ids) {
            sets.push(await this.readById(id, sr, filterBy))
        }
        return Promise.resolve(sets)
    }

    readNeighbour(rule: internal.RewriteRule, direction: RewriteRuleMoveDirection): Promise<internal.RewriteRule | undefined> {
        const ordered = this.rules()
            .filter(entry => entry.setId == rule.setId && entry.direction == rule.direction && entry.field == rule.field)
            .sort((a, b) => a.priority - b.priority || a.id - b.id)
        const index = ordered.findIndex(entry => entry.id == rule.id)
        const neighbour = ordered[direction == RewriteRuleMoveDirection.Up ? index - 1 : index + 1]
        return Promise.resolve(neighbour && {...neighbour})
    }

    readPriorityConflicts(rules: internal.RewriteRule[], excludeIds: number[]): Promise<internal.RewriteRule[]> {
        const conflicts = this.rules().filter(entry => !excludeIds.includes(entry.id)
            && rules.some(rule => rule.setId == entry.setId && rule.direction == entry.direction
                && rule.field == entry.field && rule.priority == entry.priority))
        return Promise.resolve(conflicts.map(rule => ({...rule})))
    }

    readMaxPriorities(setIds: number[]): Promise<Map<number, number>> {
        const max = new Map<number, number>()
        for (const rule of this.rules().filter(entry => setIds.includes(entry.setId)))
            max.set(rule.setId, Math.max(max.get(rule.setId) ?? 0, rule.priority))
        return Promise.resolve(max)
    }

    lockSets(_ids: number[]): Promise<void> {
        return Promise.resolve()
    }

    updatePriority(id: number, priority: number): Promise<void> {
        this.throwErrorIfIdNotExists(id)
        this.db[id].priority = priority
        return Promise.resolve()
    }

    private rules(): internal.RewriteRule[] {
        return Object.values(this.db)
    }

    private throwErrorIfIdNotExists(id: number): void {
        if (this.db[id] == undefined)
            throw new NotFoundException()
    }

}
