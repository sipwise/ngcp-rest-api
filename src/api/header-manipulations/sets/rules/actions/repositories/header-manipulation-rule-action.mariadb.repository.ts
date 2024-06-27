import {Injectable, NotFoundException} from '@nestjs/common'
import {db, internal} from '../../../../../../entities'
import {ServiceRequest} from '../../../../../../interfaces/service-request.interface'
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
}

@Injectable()
export class HeaderManipulationRuleActionMariadbRepository extends MariaDbRepository implements HeaderManipulationRuleActionRepository {
    private readonly log = new LoggerService(HeaderManipulationRuleActionMariadbRepository.name)

    async create(entities: internal.HeaderRuleAction[]): Promise<internal.HeaderRuleAction[]> {
        const qb = db.provisioning.VoipHeaderRuleAction.createQueryBuilder('headerRuleAction')
        const values = await Promise.all(entities.map(async entity => new db.provisioning.VoipHeaderRuleAction().fromInternal(entity)))
        const result = await qb.insert().values(values).execute()

        const ids = await Promise.all(result.identifiers.map(async obj => obj.id))
        const created = await qb.andWhereInIds(ids).getMany()

        return await Promise.all(created.map(async entity => entity.toInternal()))
    }

    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.HeaderRuleAction[], number]> {
        const qb = db.provisioning.VoipHeaderRuleAction.createQueryBuilder('headerRuleAction')
        const searchDto  = new HeaderManipulationRuleActionSearchDto()
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
        ))
        this.addFilterBy(qb, filterBy)
        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(
            result.map(async (d) =>
                d.toInternal(),
            ),
        ), totalCount]
    }

    async readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.HeaderRuleAction> {
        const qb = db.provisioning.VoipHeaderRuleAction.createQueryBuilder('headerRuleAction')
        const searchDto  = new HeaderManipulationRuleActionSearchDto()
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
            undefined,
        ))
        qb.where({id: id})
        this.addFilterBy(qb, filterBy)
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    async readWhereInIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.HeaderRuleAction[]> {
        const qb = db.provisioning.VoipHeaderRuleAction.createQueryBuilder('headerRuleAction')
        const searchDto  = new HeaderManipulationRuleActionSearchDto()
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
        const qb = db.provisioning.VoipHeaderRuleAction.createQueryBuilder('headerRuleAction')
        const searchDto = new HeaderManipulationRuleActionSearchDto()
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
            undefined,
        ))
        qb.whereInIds(ids)
        this.addFilterBy(qb, filterBy)
        return await qb.getCount()
    }

    async update(updates: Dictionary<internal.HeaderRuleAction>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const dbEntity = db.provisioning.VoipHeaderRuleAction.create()
            dbEntity.fromInternal(updates[id])
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
            let ruleJoin = false
            if (filterBy.ruleId) {
                qb.andWhere('rule_id = :ruleId', {ruleId: filterBy.ruleId})
            }
            if (filterBy.setId) {
                if (!ruleJoin) {
                    qb.innerJoin('headerRuleAction.rule', 'headerRule')
                    ruleJoin = true
                }
                qb.andWhere('headerRule.set_id = :setId', {setId: filterBy.setId})
            }
            if (filterBy.resellerId) {
                if (!ruleJoin) {
                    qb.innerJoin('headerRuleAction.rule', 'headerRule')
                    ruleJoin = true
                }
                qb.innerJoin('headerRule.set', 'headerRuleSet')
                qb.andWhere('headerRuleSet.reseller_id = :resellerId', {resellerId: filterBy.resellerId})
            }
        }
    }
}
