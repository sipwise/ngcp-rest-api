import {Injectable} from '@nestjs/common'
import {In, SelectQueryBuilder} from 'typeorm'

import {TimeSetEventSearchDto} from '~/api/time-sets/events/dto/event-search.dto'
import {FilterBy, TimeSetEventRepository} from '~/api/time-sets/events/interfaces/event.repository'
import {db, internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {mapYield} from '~/helpers/yield.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

// the zero date, which a Date can't carry
const zeroDate = (): string => '\'0000-00-00 00:00:00\''

@Injectable()
export class TimeSetEventMariadbRepository extends MariaDbRepository implements TimeSetEventRepository {
    async create(entities: internal.TimeSetEvent[], _sr: ServiceRequest): Promise<number[]> {
        if (!entities.length)
            return []
        const values = await mapYield(entities, entity => new db.provisioning.VoipTimePeriod().fromInternal(entity))
        const result = await db.provisioning.VoipTimePeriod.createQueryBuilder().insert().values(values).execute()
        return result.identifiers.map((obj: {id: number}) => obj.id)
    }

    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.TimeSetEvent[], number]> {
        const qb = await this.createBaseQueryBuilder(filterBy)
        const searchDto = new TimeSetEventSearchDto()
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr, Object.keys(searchDto), undefined, searchDto._alias))
        const [result, totalCount] = await qb.getManyAndCount()
        return [await mapYield(result, d => d.toInternal()), totalCount]
    }

    async readById(id: number, _sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.TimeSetEvent> {
        const qb = await this.createBaseQueryBuilder(filterBy)
        qb.andWhere('event.id = :id', {id})
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    async readWhereInIds(ids: number[], _sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.TimeSetEvent[]> {
        const qb = await this.createBaseQueryBuilder(filterBy)
        qb.andWhereInIds(ids)
        const result = await qb.getMany()
        return await mapYield(result, d => d.toInternal())
    }

    async update(updates: Dictionary<internal.TimeSetEvent>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const {id: _id, ...columns} = new db.provisioning.VoipTimePeriod().fromInternal(updates[id])
            // never save(): it writes the changed columns only, and an UPDATE without start in SET lets
            // ON UPDATE current_timestamp() overwrite it
            // a field a PATCH removed arrives as undefined and has to be emptied
            const emptied = Object.fromEntries(Object.entries(columns).map(([column, value]) => [column, value ?? null]))
            await db.provisioning.VoipTimePeriod.createQueryBuilder()
                .update()
                .set({...emptied, end: columns.end ?? zeroDate})
                .where('id = :id', {id})
                .execute()
        }
        return ids
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        await db.provisioning.VoipTimePeriod.delete(ids)
        return ids
    }

    async deleteByTimeSetIds(timeSetIds: number[]): Promise<void> {
        await db.provisioning.VoipTimePeriod.delete({time_set_id: In(timeSetIds)})
    }

    private createBaseQueryBuilder(filterBy?: FilterBy): Promise<SelectQueryBuilder<db.provisioning.VoipTimePeriod>> {
        const qb = db.provisioning.VoipTimePeriod.createQueryBuilder('event')
            .innerJoin('event.set', 'timeSet')
        if (filterBy?.timeSetId !== undefined)
            qb.andWhere('event.time_set_id = :timeSetId', {timeSetId: filterBy.timeSetId})
        if (filterBy?.resellerId !== undefined)
            qb.andWhere('timeSet.reseller_id = :resellerId', {resellerId: filterBy.resellerId})
        return Promise.resolve(qb)
    }
}
