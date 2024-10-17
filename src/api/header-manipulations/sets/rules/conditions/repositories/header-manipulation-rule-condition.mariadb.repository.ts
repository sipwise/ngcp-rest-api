import {Injectable, NotFoundException} from '@nestjs/common'
import {db, internal} from '../../../../../../entities'
import {ServiceRequest} from '../../../../../../interfaces/service-request.interface'
import {HeaderManipulationRuleConditionSearchDto} from '../dto/header-manipulation-rule-condition-search.dto'
import {configureQueryBuilder} from '../../../../../../helpers/query-builder.helper'
import {HeaderManipulationRuleConditionRepository} from '../interfaces/header-manipulation-rule-condition.repository'
import {SearchLogic} from '../../../../../../helpers/search-logic.helper'
import {LoggerService} from '../../../../../../logger/logger.service'
import {SelectQueryBuilder} from 'typeorm'
import {Dictionary} from '../../../../../../helpers/dictionary.helper'
import {MariaDbRepository} from '../../../../../../repositories/mariadb.repository'

export interface FilterBy {
    ruleId?: number
    setId?: number
    resellerId?: number
}

@Injectable()
export class HeaderManipulationRuleConditionMariadbRepository extends MariaDbRepository implements HeaderManipulationRuleConditionRepository {
    private readonly log = new LoggerService(HeaderManipulationRuleConditionMariadbRepository.name)

    async create(entities: internal.HeaderRuleCondition[]): Promise<internal.HeaderRuleCondition[]> {
        await this.addRewruleRuleSetDpidToEntities(entities)

        const ids = []

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

        const qb = db.provisioning.VoipHeaderRuleCondition.createQueryBuilder('headerRuleCondition')
        this.joinAndMapRewriteRuleSet(qb)
        const created = await qb.andWhereInIds(ids).getMany()
        return await Promise.all(created.map(async entity => entity.toInternal()))
    }

    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.HeaderRuleCondition[], number]> {
        const qb = db.provisioning.VoipHeaderRuleCondition.createQueryBuilder('headerRuleCondition')
        const searchDto  = new HeaderManipulationRuleConditionSearchDto()
        await this.configureSrQuery(sr)
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
        ))
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
        await this.configureSrQuery(sr)
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
            undefined,
        ))
        qb.where({id: id})
        this.addFilterBy(qb, filterBy)
        this.joinAndMapRewriteRuleSet(qb)
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    async readWhereInIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.HeaderRuleCondition[]> {
        const qb = db.provisioning.VoipHeaderRuleCondition.createQueryBuilder('headerRuleCondition')
        const searchDto  = new HeaderManipulationRuleConditionSearchDto()
        await this.configureSrQuery(sr)
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
            undefined,
        ))
        qb.whereInIds(ids)
        this.addFilterBy(qb, filterBy)
        const result = await qb.getMany()
        return await Promise.all(result.map(async (d) => d.toInternal()))
    }

    async readCountOfIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<number> {
        const qb = db.provisioning.VoipHeaderRuleCondition.createQueryBuilder('headerRuleCondition')
        const searchDto = new HeaderManipulationRuleConditionSearchDto()
        await this.configureSrQuery(sr)
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
            undefined,
        ))
        qb.whereInIds(ids)
        this.addFilterBy(qb, filterBy)
        return await qb.getCount()
    }

    async update(updates: Dictionary<internal.HeaderRuleCondition>, sr: ServiceRequest): Promise<number[]> {
        await this.addRewruleRuleSetDpidToDict(updates)
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const dbEntity = db.provisioning.VoipHeaderRuleCondition.create().fromInternal(updates[id])
            await db.provisioning.VoipHeaderRuleCondition.update(id, dbEntity)
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

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        await db.provisioning.VoipHeaderRuleCondition.delete(ids)
        return ids
    }

    async readConditionValues(conditionId: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.HeaderRuleConditionValue[], number]> {
        const qb = db.provisioning.VoipHeaderRuleCondition.createQueryBuilder('headerRuleCondition')
        qb.where({id: conditionId})
        this.addFilterBy(qb, filterBy)
        await qb.getOneOrFail()
        const qbValues = db.provisioning.VoipHeaderRuleConditionValue.createQueryBuilder('headerRuleConditionValue')
        const searchDto  = new HeaderManipulationRuleConditionSearchDto()
        configureQueryBuilder(qbValues, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
            undefined,
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
            let ruleJoin = false
            if (filterBy.ruleId) {
                qb.andWhere('rule_id = :ruleId', {ruleId: filterBy.ruleId})
            }
            if (filterBy.setId) {
                if (!ruleJoin) {
                    qb.innerJoin('headerRuleCondition.rule', 'headerRule')
                    ruleJoin = true
                }
                qb.andWhere('headerRule.set_id = :setId', {setId: filterBy.setId})
            }
            if (filterBy.resellerId) {
                if (!ruleJoin) {
                    qb.innerJoin('headerRuleCondition.rule', 'headerRule')
                    ruleJoin = true
                }
                qb.innerJoin('headerRule.set', 'headerRuleSet')
                qb.andWhere('headerRuleSet.reseller_id = :resellerId', {resellerId: filterBy.resellerId})
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

    private async configureSrQuery(sr: ServiceRequest): Promise<void> {
        if (sr.query.subscriber_id) {
            sr.query.subscriber_id = (await this.billingToProvisioning(+sr.query.subscriber_id)).toString()
        }
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
