import {Injectable} from '@nestjs/common'
import {EntityManager, SelectQueryBuilder} from 'typeorm'

import {ResellerPhonebookSearchDto} from '~/api/resellers/phonebook/dto/reseller-phonebook-search.dto'
import {ResellerPhonebookOptions} from '~/api/resellers/phonebook/interfaces/reseller-phonebook-options.interface'
import {ResellerPhonebookRepository} from '~/api/resellers/phonebook/interfaces/reseller-phonebook.repository'
import {db, internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

@Injectable()
export class ResellerPhonebookMariadbRepository extends MariaDbRepository implements ResellerPhonebookRepository {
    private readonly log = new LoggerService(ResellerPhonebookMariadbRepository.name)

    async create(entities: internal.ResellerPhonebook[], _sr: ServiceRequest, manager?: EntityManager): Promise<number[]> {
        const qb = manager ? manager.createQueryBuilder(db.billing.ResellerPhonebook, 'phonebook')
            : db.billing.ResellerPhonebook.createQueryBuilder('phonebook')
        const values = await Promise.all(entities.map(async entity => new db.billing.ResellerPhonebook().fromInternal(entity)))
        const result = await qb.insert().values(values).execute()

        return await Promise.all(result.identifiers.map(async (obj: {id: number}) => obj.id))
    }

    async readAll(options: ResellerPhonebookOptions, sr: ServiceRequest): Promise<[internal.ResellerPhonebook[], number]> {
        const qb = db.billing.ResellerPhonebook.createQueryBuilder('phonebook')
        const searchDto  = new ResellerPhonebookSearchDto()
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
        this.addFilterBy(qb, options.filterBy)
        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(
            result.map(async (d) =>
                d.toInternal(),
            ),
        ), totalCount]
    }

    async readById(id: number, options: ResellerPhonebookOptions, sr: ServiceRequest): Promise<internal.ResellerPhonebook> {
        const qb = db.billing.ResellerPhonebook.createQueryBuilder('phonebook')
        const searchDto  = new ResellerPhonebookSearchDto()
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
        qb.where({id: id})
        this.addFilterBy(qb, options.filterBy)
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    async update(updates: Dictionary<internal.ResellerPhonebook>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const dbEntity = db.billing.ResellerPhonebook.create()
            dbEntity.fromInternal(updates[id])
            await db.billing.ResellerPhonebook.update(id, dbEntity)
        }
        return ids
    }

    async purge(resellerId: number, _sr: ServiceRequest, manager?: EntityManager): Promise<number> {
        if (!manager) {
            await db.billing.ResellerPhonebook.delete({reseller_id: resellerId})
            return resellerId
        }

        await manager.delete(db.billing.ResellerPhonebook, {reseller_id: resellerId})
        return resellerId
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        await db.billing.ResellerPhonebook.delete(ids)
        return ids
    }

    async readWhereInNumbers(number: string[], options: ResellerPhonebookOptions, sr: ServiceRequest): Promise<number[]> {
        const qb = db.billing.ResellerPhonebook.createQueryBuilder('phonebook')
        const searchDto  = new ResellerPhonebookSearchDto()
        configureQueryBuilder(
            qb,
            sr.query,
            new SearchLogic(sr,
                Object.keys(searchDto),
                undefined,
                undefined,
            ),
        )
        qb.andWhere('phonebook.number IN (:...numbers)', {numbers: number})
        this.addFilterBy(qb, options.filterBy)
        const result = await qb.getMany()
        return await Promise.all(result.map(async (d) => d.id))
    }

    async readWhereInIds(ids: number[], options: ResellerPhonebookOptions, sr: ServiceRequest): Promise<internal.ResellerPhonebook[]> {
        const qb = db.billing.ResellerPhonebook.createQueryBuilder('phonebook')
        const searchDto  = new ResellerPhonebookSearchDto()
        configureQueryBuilder(
            qb,
            sr.query,
            new SearchLogic(sr,
                Object.keys(searchDto),
                undefined,
                undefined,
            ),
        )
        qb.whereInIds(ids)
        this.addFilterBy(qb, options.filterBy)
        const result = await qb.getMany()
        return await Promise.all(result.map(async (d) => d.toInternal()))
    }

    async readCountOfIds(ids: number[], options: ResellerPhonebookOptions, sr: ServiceRequest): Promise<number> {
        const qb = db.billing.ResellerPhonebook.createQueryBuilder('phonebook')
        const searchDto = new ResellerPhonebookSearchDto()
        configureQueryBuilder(
            qb,
            sr.query,
            new SearchLogic(
                sr,
                Object.keys(searchDto),
            ),
        )
        qb.whereInIds(ids)
        this.addFilterBy(qb, options.filterBy)
        return await qb.getCount()
    }

    private addFilterBy(qb: SelectQueryBuilder<db.billing.ResellerPhonebook>, filterBy: ResellerPhonebookOptions['filterBy']): void {
        if (filterBy) {
            if (filterBy.resellerId) {
                qb.andWhere('phonebook.reseller_id = :id', {id: filterBy.resellerId})
            }
        }
    }
}
