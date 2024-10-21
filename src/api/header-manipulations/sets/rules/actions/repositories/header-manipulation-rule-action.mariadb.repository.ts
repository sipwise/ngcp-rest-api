import {Injectable, NotFoundException} from '@nestjs/common'
import {db, internal} from '../../../../../../entities'
import {ParamsDictionary, ServiceRequest} from '../../../../../../interfaces/service-request.interface'
import {HeaderManipulationRuleActionSearchDto} from '../dto/header-manipulation-rule-action-search.dto'
import {configureQueryBuilder} from '../../../../../../helpers/query-builder.helper'
import {HeaderManipulationRuleActionRepository} from '../interfaces/header-manipulation-rule-action.repository'
import {SearchLogic} from '../../../../../../helpers/search-logic.helper'
import {LoggerService} from '../../../../../../logger/logger.service'
import {SelectQueryBuilder} from 'typeorm'
import {Dictionary} from '../../../../../../helpers/dictionary.helper'
import {MariaDbRepository} from '../../../../../../repositories/mariadb.repository'

export interface FilterBy {
    ruleId?: number
    setId?: number
    resellerId?: number
    showSubscriberActions?: boolean
}

@Injectable()
export class HeaderManipulationRuleActionMariadbRepository extends MariaDbRepository implements HeaderManipulationRuleActionRepository {
    private readonly log = new LoggerService(HeaderManipulationRuleActionMariadbRepository.name)

    async create(entities: internal.HeaderRuleAction[]): Promise<internal.HeaderRuleAction[]> {
        const qb = db.provisioning.VoipHeaderRuleAction.createQueryBuilder('headerRuleAction')

        await this.addRewruleRuleSetDpidToEntities(entities)

        const values = await Promise.all(entities.map(async entity => new db.provisioning.VoipHeaderRuleAction().fromInternal(entity)))
        const result = await qb.insert().values(values).execute()

        const ids = await Promise.all(result.identifiers.map(async obj => obj.id))

        this.joinAndMapRewriteRuleSet(qb)

        const created = await qb.andWhereInIds(ids).getMany()

        return await Promise.all(created.map(async entity => entity.toInternal()))
    }

    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.HeaderRuleAction[], number]> {
        const qb = db.provisioning.VoipHeaderRuleAction.createQueryBuilder('headerRuleAction')
        const searchDto  = new HeaderManipulationRuleActionSearchDto()
        configureQueryBuilder(
            qb,
            await this.configureSrQuery(sr),
            new SearchLogic(sr,
                Object.keys(searchDto),
                undefined,
                searchDto._alias,
            ),
        )
        qb.innerJoin('headerRuleAction.rule', 'headerRule')
        qb.innerJoin('headerRule.set', 'headerRuleSet')
        this.addFilterBy(qb, filterBy)
        this.joinAndMapRewriteRuleSet(qb)

        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(
            result.map(async (d) => d.toInternal()),
        ), totalCount]
    }

    async readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.HeaderRuleAction> {
        const qb = db.provisioning.VoipHeaderRuleAction.createQueryBuilder('headerRuleAction')
        const searchDto  = new HeaderManipulationRuleActionSearchDto()
        configureQueryBuilder(
            qb,
            await this.configureSrQuery(sr),
            new SearchLogic(sr,
                Object.keys(searchDto),
                undefined,
                searchDto._alias,
            ),
        )
        qb.where({id: id})
        qb.innerJoin('headerRuleAction.rule', 'headerRule')
        qb.innerJoin('headerRule.set', 'headerRuleSet')
        this.addFilterBy(qb, filterBy)
        this.joinAndMapRewriteRuleSet(qb)
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    async readWhereInIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.HeaderRuleAction[]> {
        const qb = db.provisioning.VoipHeaderRuleAction.createQueryBuilder('headerRuleAction')
        const searchDto  = new HeaderManipulationRuleActionSearchDto()
        configureQueryBuilder(
            qb,
            await this.configureSrQuery(sr),
            new SearchLogic(sr,
                Object.keys(searchDto),
                undefined,
                searchDto._alias,
            ),
        )
        qb.whereInIds(ids)
        qb.innerJoin('headerRuleAction.rule', 'headerRule')
        qb.innerJoin('headerRule.set', 'headerRuleSet')
        this.addFilterBy(qb, filterBy)
        this.joinAndMapRewriteRuleSet(qb)
        const result = await qb.getMany()
        return await Promise.all(result.map(async (d) => d.toInternal()))
    }

    async readCountOfIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<number> {
        const qb = db.provisioning.VoipHeaderRuleAction.createQueryBuilder('headerRuleAction')
        const searchDto = new HeaderManipulationRuleActionSearchDto()
        configureQueryBuilder(
            qb,
            await this.configureSrQuery(sr),
            new SearchLogic(sr,
                Object.keys(searchDto),
                undefined,
                searchDto._alias,
            ),
        )
        qb.innerJoin('headerRuleAction.rule', 'headerRule')
        qb.innerJoin('headerRule.set', 'headerRuleSet')
        qb.whereInIds(ids)
        this.addFilterBy(qb, filterBy)
        return await qb.getCount()
    }

    async update(updates: Dictionary<internal.HeaderRuleAction>, sr: ServiceRequest): Promise<number[]> {
        await this.addRewruleRuleSetDpidToDict(updates)
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const dbEntity = db.provisioning.VoipHeaderRuleAction.create().fromInternal(updates[id])
            await db.provisioning.VoipHeaderRuleAction.update(id, dbEntity)
        }
        return ids
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        await db.provisioning.VoipHeaderRuleAction.delete(ids)
        return ids
    }

    private addFilterBy(qb: SelectQueryBuilder<db.provisioning.VoipHeaderRuleAction>, filterBy: FilterBy): void {
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
            if (!filterBy.showSubscriberActions) {
                qb.andWhere('headerRuleSet.subscriber_id IS NULL')
            }
        }
    }

    private joinAndMapRewriteRuleSet(qb: SelectQueryBuilder<db.provisioning.VoipHeaderRuleAction>): void {
        qb.leftJoinAndMapOne(
            'headerRuleAction.rwr_set',
            db.provisioning.VoipRewriteRuleSet,
            'rwrSet',
            'rwrSet.id=headerRuleAction.rwr_set_id',
        )
    }

    private async addRewruleRuleSetDpidToEntities(entities: internal.HeaderRuleAction[]): Promise<void> {
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

    private async addRewruleRuleSetDpidToDict(updates: Dictionary<internal.HeaderRuleAction>): Promise<void> {
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

    private async configureSrQuery(sr: ServiceRequest): Promise<ParamsDictionary> {
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
