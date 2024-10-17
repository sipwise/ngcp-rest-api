import {Injectable, NotFoundException} from '@nestjs/common'
import {db, internal} from '../../../../../entities'
import {ServiceRequest} from '../../../../../interfaces/service-request.interface'
import {HeaderManipulationRuleSearchDto} from '../dto/header-manipulation-rule-search.dto'
import {configureQueryBuilder} from '../../../../../helpers/query-builder.helper'
import {HeaderManipulationRuleRepository} from '../interfaces/header-manipulation-rule.repository'
import {SearchLogic} from '../../../../../helpers/search-logic.helper'
import {LoggerService} from '../../../../../logger/logger.service'
import {SelectQueryBuilder} from 'typeorm'
import {Dictionary} from '../../../../../helpers/dictionary.helper'
import {MariaDbRepository} from '../../../../../repositories/mariadb.repository'

export interface FilterBy {
    setId?: number
    resellerId?: number
    showSubscriberRules?: boolean
}

@Injectable()
export class HeaderManipulationRuleMariadbRepository extends MariaDbRepository implements HeaderManipulationRuleRepository {
    private readonly log = new LoggerService(HeaderManipulationRuleMariadbRepository.name)

    async create(entities: internal.HeaderRule[]): Promise<internal.HeaderRule[]> {
        const qb = db.provisioning.VoipHeaderRule.createQueryBuilder('headerRule')
        const values = await Promise.all(entities.map(async entity => new db.provisioning.VoipHeaderRule().fromInternal(entity)))
        const result = await qb.insert().values(values).execute()

        const ids = await Promise.all(result.identifiers.map(async obj => obj.id))
        const created = await qb.andWhereInIds(ids).getMany()

        return await Promise.all(created.map(async entity => entity.toInternal()))
    }

    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.HeaderRule[], number]> {
        const qb = db.provisioning.VoipHeaderRule.createQueryBuilder('headerRule')
        const searchDto  = new HeaderManipulationRuleSearchDto()
        await this.configureSrQuery(sr)
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
            undefined,
            searchDto._alias,
        ))
        qb.innerJoin('headerRule.set', 'headerRuleSet')
        this.addFilterBy(qb, filterBy)
        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(
            result.map(async (d) =>
                d.toInternal(),
            ),
        ), totalCount]
    }

    async readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.HeaderRule> {
        const qb = db.provisioning.VoipHeaderRule.createQueryBuilder('headerRule')
        const searchDto  = new HeaderManipulationRuleSearchDto()
        await this.configureSrQuery(sr)
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
            undefined,
            searchDto._alias,
        ))
        qb.innerJoin('headerRule.set', 'headerRuleSet')
        qb.where({id: id})
        this.addFilterBy(qb, filterBy)
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    async readCountInSet(setId: number, sr: ServiceRequest): Promise<number> {
        const qb = db.provisioning.VoipHeaderRule.createQueryBuilder('headerRule')
        await this.configureSrQuery(sr)
        qb.where('set_id = :setId', {setId: setId})
        return await qb.getCount()
    }

    async readWhereInIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.HeaderRule[]> {
        const qb = db.provisioning.VoipHeaderRule.createQueryBuilder('headerRule')
        const searchDto  = new HeaderManipulationRuleSearchDto()
        await this.configureSrQuery(sr)
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
            undefined,
            searchDto._alias,
        ))
        qb.innerJoin('headerRule.set', 'headerRuleSet')
        qb.whereInIds(ids)
        this.addFilterBy(qb, filterBy)
        const result = await qb.getMany()
        return await Promise.all(result.map(async (d) => d.toInternal()))
    }

    async readCountOfIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<number> {
        const qb = db.provisioning.VoipHeaderRule.createQueryBuilder('headerRule')
        const searchDto = new HeaderManipulationRuleSearchDto()
        await this.configureSrQuery(sr)
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
            undefined,
            searchDto._alias,
        ))
        qb.innerJoin('headerRule.set', 'headerRuleSet')
        qb.whereInIds(ids)
        this.addFilterBy(qb, filterBy)
        return await qb.getCount()
    }

    async update(updates: Dictionary<internal.HeaderRule>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const dbEntity = db.provisioning.VoipHeaderRule.create()
            dbEntity.fromInternal(updates[id])
            await db.provisioning.VoipHeaderRule.update(id, dbEntity)
        }
        return ids
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        await db.provisioning.VoipHeaderRule.delete(ids)
        return ids
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

    private addFilterBy(qb: SelectQueryBuilder<db.provisioning.VoipHeaderRule>, filterBy: FilterBy): void {
        if (filterBy) {
            if (filterBy.setId) {
                qb.andWhere('set_id = :setId', {setId: filterBy.setId})
            }
            if (filterBy.resellerId) {
                qb.andWhere('headerRuleSet.reseller_id = :id', {id: filterBy.resellerId})
            }
            if (!filterBy.showSubscriberRules) {
                qb.andWhere('headerRuleSet.subscriber_id IS NULL')
            }
        }
    }
}
