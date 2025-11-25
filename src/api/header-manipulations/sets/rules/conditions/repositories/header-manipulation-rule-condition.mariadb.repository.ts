import {Injectable} from '@nestjs/common'
import {SelectQueryBuilder} from 'typeorm'

import {HeaderManipulationRuleConditionSearchDto} from '~/api/header-manipulations/sets/rules/conditions/dto/header-manipulation-rule-condition-search.dto'
import {HeaderManipulationRuleConditionRepository} from '~/api/header-manipulations/sets/rules/conditions/interfaces/header-manipulation-rule-condition.repository'
import {db, internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {QueriesDictionary, ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

export interface FilterBy {
    ruleId?: number
    setId?: number
    resellerId?: number
    showSubscriberConditions?: boolean
}

@Injectable()
export class HeaderManipulationRuleConditionMariadbRepository extends MariaDbRepository implements HeaderManipulationRuleConditionRepository {
    private readonly log = new LoggerService(HeaderManipulationRuleConditionMariadbRepository.name)

    async create(entities: internal.HeaderRuleCondition[]): Promise<number[]> {
        await this.addRewruleRuleSetDpidToEntities(entities)

        const ids: number[] = []

        await Promise.all(entities.map(async entity => {
            const condition = db.provisioning.VoipHeaderRuleCondition.create().fromInternal(entity)
            await condition.save()

            if (entity.values && entity.values.length > 0) {
                const conditionValues = entity.values.map(value => {
                    const conditionValue = new db.provisioning.VoipHeaderRuleConditionValue()
                    conditionValue.condition_id = condition.id
                    conditionValue.value = value
                    return conditionValue
                })
                await Promise.all(conditionValues.map(conditionValue => conditionValue.save()))
            }
            ids.push(condition.id)
        }))

        return ids
    }

    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.HeaderRuleCondition[], number]> {
        const qb = db.provisioning.VoipHeaderRuleCondition.createQueryBuilder('headerRuleCondition')
        const searchDto  = new HeaderManipulationRuleConditionSearchDto()
        configureQueryBuilder(
            qb,
            await this.configureSrQuery(sr),
            new SearchLogic(
                sr,
                Object.keys(searchDto),
                undefined,
                searchDto._alias,
            ),
        )
        qb.innerJoin('headerRuleCondition.rule', 'headerRule')
        qb.innerJoin('headerRule.set', 'headerRuleSet')
        this.addFilterBy(qb, filterBy)
        this.joinAndMapRewriteRuleSet(qb)
        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(
            result.map(async (d) =>
                d.toInternal(),
            ),
        ), totalCount]
    }

    async readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.HeaderRuleCondition> {
        const qb = db.provisioning.VoipHeaderRuleCondition.createQueryBuilder('headerRuleCondition')
        const searchDto  = new HeaderManipulationRuleConditionSearchDto()
        configureQueryBuilder(
            qb,
            await this.configureSrQuery(sr),
            new SearchLogic(
                sr,
                Object.keys(searchDto),
                undefined,
                searchDto._alias,
            ),
        )
        qb.where({id: id})
        qb.innerJoin('headerRuleCondition.rule', 'headerRule')
        qb.innerJoin('headerRule.set', 'headerRuleSet')
        this.addFilterBy(qb, filterBy)
        this.joinAndMapRewriteRuleSet(qb)
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    async readWhereInIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.HeaderRuleCondition[]> {
        const qb = db.provisioning.VoipHeaderRuleCondition.createQueryBuilder('headerRuleCondition')
        const searchDto  = new HeaderManipulationRuleConditionSearchDto()
        configureQueryBuilder(
            qb,
            await this.configureSrQuery(sr),
            new SearchLogic(
                sr,
                Object.keys(searchDto),
                undefined,
                searchDto._alias,
            ),
        )
        qb.whereInIds(ids)
        qb.innerJoin('headerRuleCondition.rule', 'headerRule')
        qb.innerJoin('headerRule.set', 'headerRuleSet')
        this.addFilterBy(qb, filterBy)
        this.joinAndMapRewriteRuleSet(qb)
        const result = await qb.getMany()
        return await Promise.all(result.map(async (d) => d.toInternal()))
    }

    async readCountOfIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<number> {
        const qb = db.provisioning.VoipHeaderRuleCondition.createQueryBuilder('headerRuleCondition')
        const searchDto = new HeaderManipulationRuleConditionSearchDto()
        configureQueryBuilder(
            qb,
            await this.configureSrQuery(sr),
            new SearchLogic(
                sr,
                Object.keys(searchDto),
                undefined,
                searchDto._alias,
            ),
        )
        qb.whereInIds(ids)
        qb.innerJoin('headerRuleCondition.rule', 'headerRule')
        qb.innerJoin('headerRule.set', 'headerRuleSet')
        this.addFilterBy(qb, filterBy)
        return await qb.getCount()
    }

    async update(updates: Dictionary<internal.HeaderRuleCondition>, _sr: ServiceRequest, resetValues: boolean = true): Promise<number[]> {
        await this.addRewruleRuleSetDpidToDict(updates)
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const dbEntity = db.provisioning.VoipHeaderRuleCondition.create().fromInternal(updates[id])
            await db.provisioning.VoipHeaderRuleCondition.update(id, dbEntity)
            if (resetValues)
                await db.provisioning.VoipHeaderRuleConditionValue.delete({condition_id: id})
            if (updates[id].values) {
                await Promise.all(updates[id].values.map(async value => {
                    const conditionValue = new db.provisioning.VoipHeaderRuleConditionValue()
                    conditionValue.condition_id = id
                    conditionValue.value = value
                    await conditionValue.save()
                }))
            }
        }
        return ids
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        await db.provisioning.VoipHeaderRuleCondition.delete(ids)
        return ids
    }

    async readConditionValues(conditionId: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.HeaderRuleConditionValue[], number]> {
        const qb = db.provisioning.VoipHeaderRuleCondition.createQueryBuilder('headerRuleCondition')
        qb.where({id: conditionId})
        qb.innerJoin('headerRuleCondition.rule', 'headerRule')
        qb.innerJoin('headerRule.set', 'headerRuleSet')
        this.addFilterBy(qb, filterBy)
        await qb.getOneOrFail()
        const qbValues = db.provisioning.VoipHeaderRuleConditionValue.createQueryBuilder('headerRuleConditionValue')
        const searchDto  = new HeaderManipulationRuleConditionSearchDto()
        configureQueryBuilder(qbValues, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
            undefined,
            searchDto._alias,
        ))
        qbValues.where({condition_id: conditionId})

        const [result, totalCount] = await qbValues.getManyAndCount()
        return [await Promise.all(
            result.map(async (d) =>
                d.toInternal(),
            ),
        ), totalCount]
    }

    private addFilterBy(qb: SelectQueryBuilder<db.provisioning.VoipHeaderRuleCondition>, filterBy: FilterBy): void {
        if (filterBy) {
            if (filterBy.ruleId) {
                qb.andWhere('rule_id = :ruleId', {ruleId: filterBy.ruleId})
            }
            if (filterBy.setId) {
                qb.andWhere('headerRule.set_id = :setId', {setId: filterBy.setId})
            }
            if (filterBy.resellerId) {
                qb.andWhere('headerRuleSet.reseller_id = :resellerId', {resellerId: filterBy.resellerId})
            }
            if (!filterBy.showSubscriberConditions) {
                qb.andWhere('headerRuleSet.subscriber_id IS NULL')
            }
        }
    }

    private joinAndMapRewriteRuleSet(qb: SelectQueryBuilder<db.provisioning.VoipHeaderRuleCondition>): void {
        qb.leftJoinAndMapOne(
            'headerRuleCondition.rwr_set',
            db.provisioning.VoipRewriteRuleSet,
            'rwrSet',
            'rwrSet.id=headerRuleCondition.rwr_set_id',
        )
    }

    private async addRewruleRuleSetDpidToEntities(entities: internal.HeaderRuleCondition[]): Promise<void> {
        const qbRwrSet = db.provisioning.VoipRewriteRuleSet.createQueryBuilder('rewriteRuleSet')
        const ids = await Promise.all(entities.map(async entity => entity.rwrSetId ? entity.rwrSetId : 0))
        qbRwrSet.whereInIds(ids)
        const rwrSetsResult = await qbRwrSet.getMany()
        const rwrSetsMap = new Map<number, db.provisioning.VoipRewriteRuleSet>()
        await Promise.all(rwrSetsResult.map(async entry => rwrSetsMap.set(entry.id, entry)))
        await Promise.all(entities.map(async entity => {
            if (entity.rwrDp && entity.rwrSetId && rwrSetsMap.has(entity.rwrSetId)) {
                entity.rwrDpId = rwrSetsMap.get(entity.rwrSetId)[`${entity.rwrDp}_dpid`]
            }
        }))
    }

    private async addRewruleRuleSetDpidToDict(updates: Dictionary<internal.HeaderRuleCondition>): Promise<void> {
        const qbRwrSet = db.provisioning.VoipRewriteRuleSet.createQueryBuilder('rewriteRuleSet')
        const ids = await Promise.all(Object.values(updates).map(async entity => entity.rwrSetId ? entity.rwrSetId : 0))
        qbRwrSet.whereInIds(ids)
        const rwrSetsResult = await qbRwrSet.getMany()
        const rwrSetsMap = new Map<number, db.provisioning.VoipRewriteRuleSet>()
        await Promise.all(rwrSetsResult.map(async entry => rwrSetsMap.set(entry.id, entry)))
        await Promise.all(Object.values(updates).map(async entity => {
            if (entity.rwrDp && entity.rwrSetId && rwrSetsMap.has(entity.rwrSetId)) {
                entity.rwrDpId = rwrSetsMap.get(entity.rwrSetId)[`${entity.rwrDp}_dpid`]
            } else {
                entity.rwrDpId = null
            }
        }))
    }

    private async configureSrQuery(sr: ServiceRequest): Promise<QueriesDictionary> {
        const query = {...sr.query}
        if (sr.query.subscriber_id) {
            query.subscriber_id = (await this.billingToProvisioning(+sr.query.subscriber_id)).toString()
        }
        return query
    }

    private async billingToProvisioning(billingSubscriberId: number | null | undefined): Promise<number> {
        if (!billingSubscriberId) {
            return billingSubscriberId
        }
        const qb = db.billing.VoipSubscriber.createQueryBuilder('bVoipSubscriber')
        qb.where({id: billingSubscriberId})
        qb.leftJoinAndSelect('bVoipSubscriber.provisioningVoipSubscriber', 'provisioningVoipSubscriber')
        const subscriber = await qb.getOneOrFail()
        return subscriber.provisioningVoipSubscriber.id
    }
}
