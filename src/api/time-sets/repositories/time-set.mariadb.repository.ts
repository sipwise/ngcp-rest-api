import {Injectable} from '@nestjs/common'
import {In, SelectQueryBuilder} from 'typeorm'

import {TimeSetSearchDto} from '~/api/time-sets/dto/time-set-search.dto'
import {FilterBy, TimeSetRepository} from '~/api/time-sets/interfaces/time-set.repository'
import {db, internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {mapYield} from '~/helpers/yield.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

@Injectable()
export class TimeSetMariadbRepository extends MariaDbRepository implements TimeSetRepository {
    async create(entities: internal.TimeSet[], _sr: ServiceRequest): Promise<number[]> {
        const values = await mapYield(entities, entity => new db.provisioning.VoipTimeSet().fromInternal(entity))
        const result = await db.provisioning.VoipTimeSet.createQueryBuilder().insert().values(values).execute()
        return result.identifiers.map((obj: {id: number}) => obj.id)
    }

    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.TimeSet[], number]> {
        const qb = await this.createBaseQueryBuilder(filterBy)
        const searchDto = new TimeSetSearchDto()
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr, Object.keys(searchDto), undefined, searchDto._alias))
        const [result, totalCount] = await qb.getManyAndCount()
        return [await mapYield(result, d => d.toInternal()), totalCount]
    }

    async readById(id: number, _sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.TimeSet> {
        const qb = await this.createBaseQueryBuilder(filterBy)
        qb.andWhere('timeSet.id = :id', {id})
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    async readWhereInIds(ids: number[], _sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.TimeSet[]> {
        const qb = await this.createBaseQueryBuilder(filterBy)
        qb.andWhereInIds(ids)
        const result = await qb.getMany()
        return await mapYield(result, d => d.toInternal())
    }

    // the iCalendar of call routing (v_time_sets_ical), null for a time set without events
    async readIcal(id: number): Promise<string | null> {
        const row = await db.provisioning.VTimeSetIcal.findOneBy({id})
        return row?.ical ?? null
    }

    // ids of `ids` that are resellers, unset ids are left out
    async readExistingResellerIds(ids: number[]): Promise<number[]> {
        const resellerIds = ids.filter(id => id != null)
        if (!resellerIds.length)
            return []
        const resellers = await db.billing.Reseller.find({select: {id: true}, where: {id: In(resellerIds)}})
        return resellers.map(reseller => reseller.id)
    }

    // time sets with one of the names, except excludeIds (names are unique across resellers)
    async readNameConflicts(names: string[], excludeIds: number[]): Promise<internal.TimeSet[]> {
        if (!names.length)
            return []
        const qb = db.provisioning.VoipTimeSet.createQueryBuilder('timeSet')
            .select(['timeSet.id', 'timeSet.name'])
            .where('timeSet.name IN (:...names)', {names})
        if (excludeIds.length)
            qb.andWhere('timeSet.id NOT IN (:...excludeIds)', {excludeIds})
        const result = await qb.getMany()
        return await mapYield(result, d => d.toInternal())
    }

    // ids of `ids` that a peering group or an NCOS level refers to
    async readUsedIds(ids: number[]): Promise<number[]> {
        if (!ids.length)
            return []
        const result = await db.provisioning.VoipTimeSet.createQueryBuilder('timeSet')
            .select('timeSet.id')
            .where('timeSet.id IN (:...ids)', {ids})
            .andWhere(qb => `(EXISTS ${qb.subQuery()
                .select('1')
                .from(db.provisioning.VoipPeeringGroup, 'peeringGroup')
                .where('peeringGroup.time_set_id = timeSet.id')
                .getQuery()
            } OR EXISTS ${qb.subQuery()
                .select('1')
                .from(db.billing.NCOSLevel, 'ncosLevel')
                .where('ncosLevel.time_set_id = timeSet.id')
                .getQuery()
            })`)
            .getMany()
        return result.map(timeSet => timeSet.id)
    }

    async update(updates: Dictionary<internal.TimeSet>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const {reseller_id, name} = new db.provisioning.VoipTimeSet().fromInternal(updates[id])
            await db.provisioning.VoipTimeSet.update(id, {reseller_id, name})
        }
        return ids
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        await db.provisioning.VoipTimeSet.delete(ids)
        return ids
    }

    private createBaseQueryBuilder(filterBy?: FilterBy): Promise<SelectQueryBuilder<db.provisioning.VoipTimeSet>> {
        const qb = db.provisioning.VoipTimeSet.createQueryBuilder('timeSet')
        if (filterBy?.resellerId !== undefined)
            qb.andWhere('timeSet.reseller_id = :resellerId', {resellerId: filterBy.resellerId})
        return Promise.resolve(qb)
    }
}
