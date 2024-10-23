import {Injectable, NotFoundException} from '@nestjs/common'
import {db, internal} from '../../../entities'
import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {NCOSSetSearchDto} from '../dto/ncos-set-search.dto'
import {configureQueryBuilder} from '../../../helpers/query-builder.helper'
import {NCOSSetRepository} from '../interfaces/ncos-set.repository'
import {SearchLogic} from '../../../helpers/search-logic.helper'
import {LoggerService} from '../../../logger/logger.service'
import {SelectQueryBuilder} from 'typeorm'
import {NCOSSetLevelSearchDto} from '../dto/ncos-set-level-search.dto'
import {Dictionary} from '../../../helpers/dictionary.helper'
import {MariaDbRepository} from '../../../repositories/mariadb.repository'

interface FilterBy {
    resellerId?: number
    exposeToCustomer?: boolean
}

@Injectable()
export class NCOSSetMariadbRepository extends MariaDbRepository implements NCOSSetRepository {
    private readonly log = new LoggerService(NCOSSetMariadbRepository.name)

    async create(entities: internal.NCOSSet[]): Promise<internal.NCOSSet[]> {
        const qb = db.billing.NCOSSet.createQueryBuilder('ncosSet')
        const values = await Promise.all(entities.map(async entity => new db.billing.NCOSSet().fromInternal(entity)))
        const result = await qb.insert().values(values).execute()

        const ids = await Promise.all(result.identifiers.map(async obj => obj.id))
        const created = await qb.andWhereInIds(ids).getMany()

        return await Promise.all(created.map(async entity => entity.toInternal()))
    }

    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.NCOSSet[], number]> {
        const qb = db.billing.NCOSSet.createQueryBuilder('ncosSet')
        const searchDto  = new NCOSSetSearchDto()
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

    async readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.NCOSSet> {
        const qb = db.billing.NCOSSet.createQueryBuilder('ncosSet')
        const searchDto  = new NCOSSetSearchDto()
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
            undefined,
        ))
        qb.where({id: id})
        this.addFilterBy(qb, filterBy)
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    async readWhereInIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.NCOSSet[]> {
        const qb = db.billing.NCOSSet.createQueryBuilder('ncosSet')
        const searchDto  = new NCOSSetSearchDto()
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
        const qb = db.billing.NCOSSet.createQueryBuilder('ncosSet')
        const searchDto = new NCOSSetSearchDto()
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
            undefined,
        ))
        qb.whereInIds(ids)
        this.addFilterBy(qb, filterBy)
        return await qb.getCount()
    }

    async update(updates: Dictionary<internal.NCOSSet>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const dbEntity = db.billing.NCOSSet.create()
            dbEntity.fromInternal(updates[id])
            await db.billing.NCOSSet.update(id, dbEntity)
        }
        return ids
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        await db.billing.NCOSSet.delete(ids)
        return ids
    }

    async revokeNCOSSetPreferences(setIds: number[]): Promise<void> {
        const preference = await db.provisioning.VoipPreference.createQueryBuilder()
            .where('attribute = :attribute', {attribute: 'ncos_set_id'})
            .getOneOrFail()
        await db.provisioning.VoipContractPreference.createQueryBuilder()
            .delete()
            .where('attribute_id = :id', {id: preference.id})
            .andWhere('value in (:...ids)', {ids: setIds})
            .execute()
        await db.provisioning.VoipUsrPreference.createQueryBuilder()
            .delete()
            .where('attribute_id = :id', {id: preference.id})
            .andWhere('value in (:...ids)', {ids: setIds})
            .execute()
    }

    async deleteNCOSSetPreferences(setIds: number[]): Promise<void> {
        const preferences = await db.provisioning.VoipPreference.createQueryBuilder()
            .where('attribute in (:...attributes)', {attributes: ['ncos_set_id', 'adm_ncos_set_id','adm_cf_ncos_set_id']})
            .getMany()
        const attributeIds = preferences.map(p => p.id)
        await db.provisioning.VoipContractPreference.createQueryBuilder()
            .delete()
            .where('attribute_id in (:...attributeIds)', {attributeIds: [attributeIds]})
            .andWhere('value in (:...ids)', {ids: setIds})
            .execute()
        await db.provisioning.VoipDomPreference.createQueryBuilder()
            .delete()
            .where('attribute_id in (:...attributeIds)', {attributeIds: [attributeIds]})
            .andWhere('value in (:...ids)', {ids: setIds})
            .execute()
        await db.provisioning.VoipProfPreference.createQueryBuilder()
            .delete()
            .where('attribute_id in (:...attributeIds)', {attributeIds: [attributeIds]})
            .andWhere('value in (:...ids)', {ids: setIds})
            .execute()
        await db.provisioning.VoipUsrPreference.createQueryBuilder()
            .delete()
            .where('attribute_id in (:...attributeIds)', {attributeIds: [attributeIds]})
            .andWhere('value in (:...ids)', {ids: setIds})
            .execute()
    }

    async createLevel(entities: internal.NCOSSetLevel[], _sr: ServiceRequest): Promise<internal.NCOSSetLevel[]> {
        const qb = db.billing.NCOSSetLevel.createQueryBuilder('ncosSetLevel')
        qb.innerJoinAndSelect('ncosSetLevel.level', 'level')
        const values = await Promise.all(
            entities.map(
                async entity => new db.billing.NCOSSetLevel().fromInternal(entity),
            ),
        )
        const result = await qb.insert().values(values).execute()

        const ids = await Promise.all(result.identifiers.map(async obj => obj.id))
        const created = await qb.andWhereInIds(ids).getMany()

        return await Promise.all(created.map(async entity => entity.toInternal()))
    }

    async readLevelAll(_sr: ServiceRequest, id?: number, _filterBy?: FilterBy): Promise<[internal.NCOSSetLevel[], number]> {
        const qb = db.billing.NCOSSetLevel.createQueryBuilder('ncosSetLevel')
        qb.innerJoinAndSelect('ncosSetLevel.level', 'level')
        if (id)
            qb.where({ncos_set_id: id})
        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(
            result.map(async (d) =>
                d.toInternal(),
            ),
        ), totalCount]
    }

    async readLevelById(id: number, levelId: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.NCOSSetLevel> {
        const qb = db.billing.NCOSSetLevel.createQueryBuilder('ncosSetLevel')
        qb.innerJoinAndSelect('ncosSetLevel.level', 'level')
        const searchDto  = new NCOSSetLevelSearchDto()
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
            undefined,
        ))
        qb.where({id: levelId})
        if (id)
            qb.andWhere({ncos_set_id: id})
        this.addLevelFilterBy(qb, filterBy)
        const result = await qb.getOne()
        if (!result)
            throw new NotFoundException()
        return result.toInternal()
    }

    async deleteLevel(_id: number, levelId: number, _sr: ServiceRequest): Promise<number> {
        await db.billing.NCOSSetLevel.delete({id: levelId})

        return 1
    }

    private addFilterBy(qb: SelectQueryBuilder<db.billing.NCOSSet>, filterBy: FilterBy): void {
        if (filterBy) {
            if (filterBy.resellerId) {
                qb.andWhere('reseller_id = :id', {id: filterBy.resellerId})
            }
            if (filterBy.exposeToCustomer) {
                qb.andWhere('expose_to_customer = :etc', {etc: filterBy.exposeToCustomer})
            }
        }
    }

    private addLevelFilterBy(qb: SelectQueryBuilder<db.billing.NCOSSetLevel>, filterBy: FilterBy): void {
        if (filterBy) {
            if (filterBy.resellerId) {
                qb.innerJoin('ncosSetLevel.set', 'ncosSet')
                qb.andWhere('ncosSet.reseller_id = :id', {id: filterBy.resellerId})
            }
        }
    }
}
