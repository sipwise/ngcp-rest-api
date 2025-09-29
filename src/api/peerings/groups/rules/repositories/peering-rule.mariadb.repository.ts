import {Injectable} from '@nestjs/common'
import {SelectQueryBuilder} from 'typeorm'

import {PeeringRuleSearchDto} from '~/api/peerings/groups/rules/dto/peering-rule-search.dto'
import {PeeringRuleRepository} from '~/api/peerings/groups/rules/interfaces/peering-rule.repository'
import {db, internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

export interface FilterBy {
    group_id?: number
}

@Injectable()
export class PeeringRuleMariadbRepository extends MariaDbRepository implements PeeringRuleRepository {
    private readonly log = new LoggerService(PeeringRuleMariadbRepository.name)

    async create(entities: internal.VoipPeeringRule[]): Promise<number[]> {
        const qb = db.provisioning.VoipPeeringRule.createQueryBuilder('rule')
        const values = await Promise.all(entities.map(async entity => new db.provisioning.VoipPeeringRule().fromInternal(entity)))
        const result = await qb.insert().values(values).execute()

        return await Promise.all(result.identifiers.map(async (obj: {id: number}) => obj.id))
    }

    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.VoipPeeringRule[], number]> {
        const qb = db.provisioning.VoipPeeringRule.createQueryBuilder('rule')
        const searchDto  = new PeeringRuleSearchDto()
        configureQueryBuilder(
            qb,
            sr.query,
            new SearchLogic(
                sr,
                Object.keys(searchDto),
                undefined,
                searchDto._alias,
            ),
        )
        this.addFilterBy(qb, filterBy)
        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(
            result.map(async (d) =>
                d.toInternal(),
            ),
        ), totalCount]
    }

    async readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.VoipPeeringRule> {
        const qb = db.provisioning.VoipPeeringRule.createQueryBuilder('rule')
        const searchDto  = new PeeringRuleSearchDto()
        configureQueryBuilder(
            qb,
            sr.query,
            new SearchLogic(
                sr,
                Object.keys(searchDto),
                undefined,
                searchDto._alias,
            ),
        )
        qb.where({id: id})
        this.addFilterBy(qb, filterBy)
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    async readWhereInIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.VoipPeeringRule[]> {
        const qb = db.provisioning.VoipPeeringRule.createQueryBuilder('rule')
        const searchDto  = new PeeringRuleSearchDto()
        configureQueryBuilder(
            qb,
            sr.query,
            new SearchLogic(
                sr,
                Object.keys(searchDto),
                undefined,
                searchDto._alias,
            ),
        )
        qb.whereInIds(ids)
        this.addFilterBy(qb, filterBy)
        const result = await qb.getMany()
        return await Promise.all(result.map(async (d) => d.toInternal()))
    }

    async update(updates: Dictionary<internal.VoipPeeringRule>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const dbEntity = db.provisioning.VoipPeeringRule.create()
            dbEntity.fromInternal(updates[id])
            await db.provisioning.VoipPeeringRule.update(id, dbEntity)
        }
        return ids
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        await db.provisioning.VoipPeeringRule.delete(ids)
        return ids
    }

    private addFilterBy(qb: SelectQueryBuilder<db.provisioning.VoipPeeringRule>, filterBy: FilterBy): void {
        if (filterBy) {
            if (filterBy.group_id) {
                qb.andWhere('group_id = :groupId', {groupId: filterBy.group_id})
            }
        }
    }
}
