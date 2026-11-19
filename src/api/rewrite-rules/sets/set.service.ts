
import {Inject, Injectable} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {FilterBy, RewriteRuleSetMariadbRepository} from './repositories/set.mariadb.repository'
import {RewriteRuleSetRedisRepository} from './repositories/set.redis.repository'

import {AppService} from '~/app.service'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {throwMissingIds} from '~/helpers/errors.helper'
import {runOnceOnTransactionCommit} from '~/helpers/post-commit-queue.helper'
import {TaskAgentHelper} from '~/helpers/task-agent.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class RewriteRuleSetService implements CrudService<internal.RewriteRuleSet> {
    private readonly log = new LoggerService(RewriteRuleSetService.name)

    constructor(
        @Inject (I18nService) private readonly i18n: I18nService,
        @Inject (RewriteRuleSetMariadbRepository) private readonly ruleSetRepo: RewriteRuleSetMariadbRepository,
        @Inject (AppService) private readonly app: AppService,
        @Inject (RewriteRuleSetRedisRepository) private readonly ruleSetRedisRepo: RewriteRuleSetRedisRepository,
        @Inject (TaskAgentHelper) private readonly taskAgentHelper: TaskAgentHelper,
    ) {
    }

    async create(entities: internal.RewriteRuleSet[], sr: ServiceRequest): Promise<internal.RewriteRuleSet[]> {
        this.assignUserResellerId(entities, sr)
        const created = await this.ruleSetRepo.create(entities)
        return await this.ruleSetRepo.readWhereInIds(created, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.RewriteRuleSet[], number]> {
        const filters: FilterBy = {}
        if (sr.user.reseller_id_required)
            filters.resellerId = sr.user.reseller_id

        return await this.ruleSetRepo.readAll(sr, filters)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.RewriteRuleSet> {
        const filters: FilterBy = {}
        if (sr.user.reseller_id_required)
            filters.resellerId = sr.user.reseller_id

        return await this.ruleSetRepo.readById(id, sr, filters)
    }

    async update(updates: Dictionary<internal.RewriteRuleSet>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))

        let sets: internal.RewriteRuleSet[]
        if (sr.user.reseller_id_required) {
            sets = await this.ruleSetRepo.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id})
        } else {
            sets = await this.ruleSetRepo.readWhereInIds(ids, sr)
        }

        throwMissingIds(sr, ids, sets.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))

        this.assignUserResellerId(Object.values(updates), sr)
        return await this.ruleSetRepo.update(updates, sr)
    }

    async updateAndCleanSets(updates: Dictionary<internal.RewriteRuleSet>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        let sets: internal.RewriteRuleSet[]
        if (sr.user.reseller_id_required) {
            sets = await this.ruleSetRepo.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id})
        } else {
            sets = await this.ruleSetRepo.readWhereInIds(ids, sr)
        }

        throwMissingIds(sr, ids, sets.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))

        this.assignUserResellerId(Object.values(updates), sr)
        const updatedIds = await this.ruleSetRepo.update(updates, sr)
        if (await this.ruleSetRepo.cleanSets(updatedIds, sr))
            this.reloadDialPlanAfterCommit(sr)
        return updatedIds
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        let sets: internal.RewriteRuleSet[]

        if (sr.user.reseller_id_required) {
            sets = await this.ruleSetRepo.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id})
        } else {
            sets = await this.ruleSetRepo.readWhereInIds(ids, sr)
        }

        throwMissingIds(sr, ids, sets.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))

        // a set without rules has no dialplan to reload
        if (await this.ruleSetRepo.hasRules(ids))
            this.reloadDialPlanAfterCommit(sr)
        const deletedIds = await this.ruleSetRepo.delete(ids, sr)

        return deletedIds
    }

    // TODO: required for mocking, as esbuild-jest has issues with jest mock
    // patterns and will be reviewed after packages upgrade
    reloadDialPlanAfterCommit(sr: ServiceRequest): void {
        runOnceOnTransactionCommit('rewrite-rules-dialplan-reload', async () => await this.ruleSetRedisRepo.reloadDialPlan(sr))
    }

    private assignUserResellerId(entities: internal.RewriteRuleSet[], sr: ServiceRequest): void {
        if (!sr.user.reseller_id_required)
            return
        for (const entity of entities)
            entity.resellerId = sr.user.reseller_id
    }
}
