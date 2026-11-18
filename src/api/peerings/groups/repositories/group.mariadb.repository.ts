import {Injectable} from '@nestjs/common'
import {In} from 'typeorm'

import {PeeringGroupSearchDto} from '~/api/peerings/groups/dto/group-search.dto'
import {PeeringGroupRepository} from '~/api/peerings/groups/interfaces/group.repository'
import {db, internal} from '~/entities'
import {ProductClass} from '~/entities/internal/product.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {mapYield} from '~/helpers/yield.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

@Injectable()
export class PeeringGroupMariadbRepository extends MariaDbRepository implements PeeringGroupRepository {
    private readonly log = new LoggerService(PeeringGroupMariadbRepository.name)

    async create(entities: internal.VoipPeeringGroup[]): Promise<number[]> {
        const qb = db.provisioning.VoipPeeringGroup.createQueryBuilder('vpg')
        const values = await mapYield(entities, entity => new db.provisioning.VoipPeeringGroup().fromInternal(entity))
        const result = await qb.insert().values(values).execute()
        return result.identifiers.map((obj: {id: number}) => obj.id)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.VoipPeeringGroup[], number]> {
        const qb = db.provisioning.VoipPeeringGroup.createQueryBuilder('vpg')
        const searchDto  = new PeeringGroupSearchDto()
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
        const [result, totalCount] = await qb.getManyAndCount()
        return [await mapYield(result, d => d.toInternal()), totalCount]
    }

    async readById(id: number, sr: ServiceRequest): Promise<internal.VoipPeeringGroup> {
        const qb = db.provisioning.VoipPeeringGroup.createQueryBuilder('vpg')
        const searchDto  = new PeeringGroupSearchDto()
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
        qb.andWhere({id: id})
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    async readWhereInIds(ids: number[], _sr: ServiceRequest): Promise<internal.VoipPeeringGroup[]> {
        const qb = db.provisioning.VoipPeeringGroup.createQueryBuilder('vpg')
        qb.andWhereInIds(ids)
        const result = await qb.getMany()
        return await mapYield(result, d => d.toInternal())
    }

    async update(updates: Dictionary<internal.VoipPeeringGroup>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const dbEntity = db.provisioning.VoipPeeringGroup.create()
            dbEntity.fromInternal(updates[id])
            await db.provisioning.VoipPeeringGroup.update(id, dbEntity)
        }
        return ids
    }

    // ids of `contractIds` that are peering contracts
    async readPeeringContractIds(contractIds: number[]): Promise<number[]> {
        const ids = contractIds.filter(id => id != null)
        if (!ids.length)
            return []
        const contracts = await db.billing.Contract.find({
            select: {id: true},
            where: {
                id: In(ids),
                product: {class: In([
                    ProductClass.PstnPeering,
                    ProductClass.SipPeering,
                ])},
            },
        })
        return contracts.map(contract => contract.id)
    }

    async hasEnabledOrProbedServerInGroups(groupIds: number[], _sr: ServiceRequest): Promise<boolean> {
        const qb = db.provisioning.VoipPeeringServer.createQueryBuilder('server')
        qb.where('group_id IN (:groupIds)', {groupIds: groupIds})
        qb.andWhere('(server.enabled = :enabled OR server.probe = :probe)', {enabled: 1, probe: 1})
        const count = await qb.getCount()
        return count > 0
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        await db.provisioning.VoipPeeringGroup.delete(ids)
        return ids
    }
}
