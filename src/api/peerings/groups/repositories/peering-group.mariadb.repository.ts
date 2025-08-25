import {Injectable} from '@nestjs/common'

import {PeeringGroupSearchDto} from '~/api/peerings/groups/dto/peering-group-search.dto'
import {PeeringGroupRepository} from '~/api/peerings/groups/interfaces/peering-group.repository'
import {db, internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

@Injectable()
export class PeeringGroupMariadbRepository extends MariaDbRepository implements PeeringGroupRepository {
    private readonly log = new LoggerService(PeeringGroupMariadbRepository.name)

    async create(entities: internal.VoipPeeringGroup[]): Promise<number[]> {
        const qb = db.provisioning.VoipPeeringGroup.createQueryBuilder('vpg')
        const values = await Promise.all(entities.map(async entity => {
            return new db.provisioning.VoipPeeringGroup().fromInternal(entity)
        }))
        const result = await qb.insert().values(values).execute()
        return await Promise.all(result.identifiers.map(async (obj: {id: number}) => obj.id))
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
        return [await Promise.all(
            result.map(async (d) => {
                return d.toInternal()
            }),
        ), totalCount]
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
        qb.where({id: id})
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    async readWhereInIds(ids: number[], sr: ServiceRequest): Promise<internal.VoipPeeringGroup[]> {
        const qb = db.provisioning.VoipPeeringGroup.createQueryBuilder('vpg')
        const searchDto  = new PeeringGroupSearchDto()
        configureQueryBuilder(
            qb,
            sr.query,
            new SearchLogic(
                sr,
                Object.keys(searchDto),
                undefined,
                undefined,
            ),
        )
        qb.whereInIds(ids)
        const result = await qb.getMany()
        return await Promise.all(result.map(async (d) => {
            return d.toInternal()
        }))
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

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        await db.provisioning.VoipPeeringGroup.delete(ids)
        return ids
    }
}
