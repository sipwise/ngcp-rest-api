import {Injectable} from '@nestjs/common'
import {SelectQueryBuilder} from 'typeorm'

import {HeaderManipulationSetSearchDto} from '~/api/header-manipulations/sets/dto/header-manipulation-set-search.dto'
import {HeaderManipulationSetRepository} from '~/api/header-manipulations/sets/interfaces/header-manipulation-set.repository'
import {db, internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ParamsDictionary, ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

export interface FilterBy {
    resellerId?: number
    showSubscriberSets?: boolean
}

@Injectable()
export class HeaderManipulationSetMariadbRepository extends MariaDbRepository implements HeaderManipulationSetRepository {
    private readonly log = new LoggerService(HeaderManipulationSetMariadbRepository.name)

    async create(entities: internal.HeaderRuleSet[]): Promise<internal.HeaderRuleSet[]> {
        const qb = db.provisioning.VoipHeaderRuleSet.createQueryBuilder('headerRuleSet')
        const values = await Promise.all(entities.map(async entity => {
            entity.subscriberId = await this.billingToProvisioning(entity.subscriberId)
            return new db.provisioning.VoipHeaderRuleSet().fromInternal(entity)
        }))
        const result = await qb.insert().values(values).execute()
        const ids = await Promise.all(result.identifiers.map(async obj => obj.id))
        const created = await qb.andWhereInIds(ids).getMany()

        return await Promise.all(created.map(async entity => {
            entity.subscriber_id = await this.provisioningToBilling(entity.subscriber_id)
            return entity.toInternal()
        }))
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
            ),
        )
        this.addFilterBy(qb, filterBy)
        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(
            result.map(async (d) => {
                d.subscriber_id = await this.provisioningToBilling(d.subscriber_id)
                return d.toInternal()
            }),
        ), totalCount]
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
            ),
        )
        qb.where({id: id})
        this.addFilterBy(qb, filterBy)
        const result = await qb.getOneOrFail()
        result.subscriber_id = await this.provisioningToBilling(result.subscriber_id)
        return result.toInternal()
    }

    async readWhereInIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.HeaderRuleSet[]> {
        const qb = db.provisioning.VoipHeaderRuleSet.createQueryBuilder('headerRuleSet')
        const searchDto  = new HeaderManipulationSetSearchDto()
        configureQueryBuilder(
            qb,
            await this.configureSrQuery(sr),
            new SearchLogic(
                sr,
                Object.keys(searchDto),
            ),
        )
        qb.whereInIds(ids)
        this.addFilterBy(qb, filterBy)
        const result = await qb.getMany()
        return await Promise.all(result.map(async (d) => {
            d.subscriber_id = await this.provisioningToBilling(d.subscriber_id)
            return d.toInternal()
        }))
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
            ),
        )
        qb.whereInIds(ids)
        this.addFilterBy(qb, filterBy)
        return await qb.getCount()
    }

    async readBySubscriberId(subscriberId: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.HeaderRuleSet[]> {
        const qb = db.provisioning.VoipHeaderRuleSet.createQueryBuilder('headerRuleSet')
        const searchDto  = new HeaderManipulationSetSearchDto()
        configureQueryBuilder(
            qb,
            await this.configureSrQuery(sr),
            new SearchLogic(
                sr,
                Object.keys(searchDto),
            ),
        )
        qb.andWhere('subscriber_id = :id', {
            id: await this.billingToProvisioning(subscriberId),
        })
        this.addFilterBy(qb, filterBy)
        const result = await qb.getMany()
        return await Promise.all(result.map(async (d) => {
            d.subscriber_id = await this.provisioningToBilling(d.subscriber_id)
            return d.toInternal()
        }))
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
        if (!billingSubscriberId) {
            return billingSubscriberId
        }
        const qb = db.billing.VoipSubscriber.createQueryBuilder('bVoipSubscriber')
        qb.where({id: billingSubscriberId})
        qb.leftJoinAndSelect('bVoipSubscriber.provisioningVoipSubscriber', 'provisioningVoipSubscriber')
        const subscriber = await qb.getOneOrFail()
        return subscriber.provisioningVoipSubscriber.id
    }

    private async provisioningToBilling(provisioningSubscriberId: number | null | undefined): Promise<number> {
        if (!provisioningSubscriberId) {
            return provisioningSubscriberId
        }
        const qb = db.provisioning.VoipSubscriber.createQueryBuilder('pVoipSubscriber')
        qb.leftJoinAndSelect('pVoipSubscriber.billing_voip_subscriber', 'billing_voip_subscriber')
        qb.where({id: provisioningSubscriberId})
        const subscriber = await qb.getOneOrFail()
        return subscriber.billing_voip_subscriber.id
    }

    private async configureSrQuery(sr: ServiceRequest): Promise<ParamsDictionary> {
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
