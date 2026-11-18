import {Injectable} from '@nestjs/common'
import {EntityNotFoundError, SelectQueryBuilder} from 'typeorm'

import {HeaderManipulationSetSearchDto} from '~/api/header-manipulations/sets/dto/set-search.dto'
import {HeaderManipulationSetRepository} from '~/api/header-manipulations/sets/interfaces/set.repository'
import {db, internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {mapYield} from '~/helpers/yield.helper'
import {QueriesDictionary, ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

export interface FilterBy {
    resellerId?: number
    showSubscriberSets?: boolean
}

@Injectable()
export class HeaderManipulationSetMariadbRepository extends MariaDbRepository implements HeaderManipulationSetRepository {
    private readonly log = new LoggerService(HeaderManipulationSetMariadbRepository.name)

    async create(entities: internal.HeaderRuleSet[]): Promise<number[]> {
        const qb = db.provisioning.VoipHeaderRuleSet.createQueryBuilder('headerRuleSet')
        const provisioningIds = await this.billingToProvisioningIds(entities.map(entity => entity.subscriberId))
        const values = await mapYield(entities, entity => {
            if (entity.subscriberId)
                entity.subscriberId = provisioningIds.get(entity.subscriberId)
            return new db.provisioning.VoipHeaderRuleSet().fromInternal(entity)
        })
        const result = await qb.insert().values(values).execute()

        return result.identifiers.map((obj: {id: number}) => obj.id)
    }

    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.HeaderRuleSet[], number]> {
        const qb = db.provisioning.VoipHeaderRuleSet.createQueryBuilder('headerRuleSet')
        const searchDto  = new HeaderManipulationSetSearchDto()
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
        this.addFilterBy(qb, filterBy)
        const [result, totalCount] = await qb.getManyAndCount()
        return [await this.toInternalSets(result), totalCount]
    }

    async readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.HeaderRuleSet> {
        const qb = db.provisioning.VoipHeaderRuleSet.createQueryBuilder('headerRuleSet')
        const searchDto  = new HeaderManipulationSetSearchDto()
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
        qb.andWhere({id: id})
        this.addFilterBy(qb, filterBy)
        const [set] = await this.toInternalSets([await qb.getOneOrFail()])
        return set
    }

    async readWhereInIds(ids: number[], _sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.HeaderRuleSet[]> {
        const qb = db.provisioning.VoipHeaderRuleSet.createQueryBuilder('headerRuleSet')
        qb.andWhereInIds(ids)
        this.addFilterBy(qb, filterBy)
        return await this.toInternalSets(await qb.getMany())
    }

    async readCountOfIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<number> {
        const qb = db.provisioning.VoipHeaderRuleSet.createQueryBuilder('headerRuleSet')
        const searchDto = new HeaderManipulationSetSearchDto()
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
        qb.andWhereInIds(ids)
        this.addFilterBy(qb, filterBy)
        return await qb.getCount()
    }

    /**
     * Id of the set of each billing subscriber of `subscriberIds` that has one (the lowest id if several); an
     * unknown subscriber is not found
     */
    async readIdsBySubscriberIds(subscriberIds: number[]): Promise<Map<number, number>> {
        const provisioningIds = await this.billingToProvisioningIds(subscriberIds)
        if (!provisioningIds.size)
            return new Map()
        const rows = await db.provisioning.VoipHeaderRuleSet.createQueryBuilder('headerRuleSet')
            .select('headerRuleSet.subscriber_id', 'subscriberId')
            .addSelect('MIN(headerRuleSet.id)', 'id')
            .where('headerRuleSet.subscriber_id IN (:...ids)', {ids: [...provisioningIds.values()]})
            .groupBy('headerRuleSet.subscriber_id')
            .getRawMany<{subscriberId: number, id: number}>()
        const setIds = new Map(rows.map(row => [row.subscriberId, row.id]))
        const result = new Map<number, number>()
        for (const [billingId, provisioningId] of provisioningIds) {
            if (setIds.has(provisioningId))
                result.set(billingId, setIds.get(provisioningId))
        }
        return result
    }

    async update(updates: Dictionary<internal.HeaderRuleSet>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const dbEntity = db.provisioning.VoipHeaderRuleSet.create()
            dbEntity.fromInternal(updates[id])
            await db.provisioning.VoipHeaderRuleSet.update(id, dbEntity)
        }
        return ids
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        await db.provisioning.VoipHeaderRuleSet.delete(ids)
        return ids
    }

    private async billingToProvisioning(billingSubscriberId: number | null | undefined): Promise<number> {
        if (!billingSubscriberId)
            return billingSubscriberId
        return (await this.billingToProvisioningIds([billingSubscriberId])).get(billingSubscriberId)
    }

    /**
     * Provisioning subscriber ids of the billing subscriber ids (empty ones skipped); an unknown id is not found
     */
    private async billingToProvisioningIds(billingSubscriberIds: number[]): Promise<Map<number, number>> {
        const ids = [...new Set(billingSubscriberIds.filter(id => id))]
        if (!ids.length)
            return new Map()
        const subscribers = await db.billing.VoipSubscriber.createQueryBuilder('bVoipSubscriber')
            .innerJoin('bVoipSubscriber.provisioningVoipSubscriber', 'provisioningVoipSubscriber')
            .select(['bVoipSubscriber.id', 'provisioningVoipSubscriber.id'])
            .whereInIds(ids)
            .getMany()
        const provisioningIds = new Map(subscribers.map(subscriber => [subscriber.id, subscriber.provisioningVoipSubscriber.id]))
        const unknownId = ids.find(id => !provisioningIds.has(id))
        if (unknownId)
            throw new EntityNotFoundError(db.billing.VoipSubscriber, {id: unknownId})
        return provisioningIds
    }

    /**
     * Billing subscriber ids of the provisioning subscriber ids (empty ones skipped); an unknown id is not found
     */
    private async provisioningToBillingIds(provisioningSubscriberIds: number[]): Promise<Map<number, number>> {
        const ids = [...new Set(provisioningSubscriberIds.filter(id => id))]
        if (!ids.length)
            return new Map()
        const subscribers = await db.provisioning.VoipSubscriber.createQueryBuilder('pVoipSubscriber')
            .innerJoin('pVoipSubscriber.billing_voip_subscriber', 'billing_voip_subscriber')
            .select(['pVoipSubscriber.id', 'billing_voip_subscriber.id'])
            .whereInIds(ids)
            .getMany()
        const billingIds = new Map(subscribers.map(subscriber => [subscriber.id, subscriber.billing_voip_subscriber.id]))
        const unknownId = ids.find(id => !billingIds.has(id))
        if (unknownId)
            throw new EntityNotFoundError(db.provisioning.VoipSubscriber, {id: unknownId})
        return billingIds
    }

    /**
     * Internal sets with billing subscriber ids
     */
    private async toInternalSets(sets: db.provisioning.VoipHeaderRuleSet[]): Promise<internal.HeaderRuleSet[]> {
        const billingIds = await this.provisioningToBillingIds(sets.map(set => set.subscriber_id))
        return await mapYield(sets, set => {
            if (set.subscriber_id)
                set.subscriber_id = billingIds.get(set.subscriber_id)
            return set.toInternal()
        })
    }

    private async configureSrQuery(sr: ServiceRequest): Promise<QueriesDictionary> {
        const query = {...sr.query}
        if (sr.query.subscriber_id) {
            query.subscriber_id = (await this.billingToProvisioning(+sr.query.subscriber_id)).toString()
        }
        return query
    }

    private addFilterBy(qb: SelectQueryBuilder<db.provisioning.VoipHeaderRuleSet>, filterBy: FilterBy): void {
        if (filterBy) {
            if (filterBy.resellerId) {
                qb.andWhere('reseller_id = :id', {id: filterBy.resellerId})
            }

            if (!filterBy.showSubscriberSets) {
                qb.andWhere('subscriber_id IS NULL')
            }
        }
    }
}
