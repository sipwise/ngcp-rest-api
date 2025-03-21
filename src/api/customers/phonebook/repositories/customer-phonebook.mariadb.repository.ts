import {Injectable} from '@nestjs/common'
import {SelectQueryBuilder} from 'typeorm'

import {CustomerPhonebookSearchDto} from '~/api/customers/phonebook/dto/customer-phonebook-search.dto'
import {CustomerPhonebookOptions} from '~/api/customers/phonebook/interfaces/customer-phonebook-options.interface'
import {db, internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

@Injectable()
export class CustomerPhonebookMariadbRepository extends MariaDbRepository implements CustomerPhonebookMariadbRepository {
    private readonly log = new LoggerService(CustomerPhonebookMariadbRepository.name)

    async create(entities: internal.CustomerPhonebook[]): Promise<number[]> {
        const qb = db.billing.ContractPhonebook.createQueryBuilder('phonebook')
        const values = await Promise.all(entities.map(async entity => new db.billing.ContractPhonebook().fromInternal(entity)))
        const result = await qb.insert().values(values).execute()

        return await Promise.all(result.identifiers.map(async (obj: {id: number}) => obj.id))
    }

    async readAll(options: CustomerPhonebookOptions, sr: ServiceRequest): Promise<[internal.CustomerPhonebook[], number]> {
        const qb = db.billing.ContractPhonebook.createQueryBuilder('phonebook')
        const searchDto  = new CustomerPhonebookSearchDto()
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
        this.addFilterBy(qb, options.filterBy)
        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(
            result.map(async (d) =>
                d.toInternal(),
            ),
        ), totalCount]
    }

    async readById(id: number, options: CustomerPhonebookOptions, sr: ServiceRequest): Promise<internal.CustomerPhonebook> {
        const qb = db.billing.ContractPhonebook.createQueryBuilder('phonebook')
        const searchDto  = new CustomerPhonebookSearchDto()
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
        this.addFilterBy(qb, options.filterBy)
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    async update(updates: Dictionary<internal.CustomerPhonebook>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const dbEntity = db.billing.ContractPhonebook.create()
            dbEntity.fromInternal(updates[id])
            await db.billing.ContractPhonebook.update(id, dbEntity)
        }
        return ids
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        await db.billing.ContractPhonebook.delete(ids)
        return ids
    }

    async readWhereInIds(ids: number[], options: CustomerPhonebookOptions, sr: ServiceRequest): Promise<internal.CustomerPhonebook[]> {
        const qb = db.billing.ContractPhonebook.createQueryBuilder('phonebook')
        const searchDto  = new CustomerPhonebookSearchDto()
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

    async readWhereInNumbers(number: string[], options: CustomerPhonebookOptions, sr: ServiceRequest): Promise<number[]> {
        const qb = db.billing.ContractPhonebook.createQueryBuilder('phonebook')
        const searchDto  = new CustomerPhonebookSearchDto()
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

    async readCountOfIds(ids: number[], options: CustomerPhonebookOptions, sr: ServiceRequest): Promise<number> {
        const qb = db.billing.ContractPhonebook.createQueryBuilder('phonebook')
        const searchDto = new CustomerPhonebookSearchDto()
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

    async readAllFromViewAll(options: CustomerPhonebookOptions, sr: ServiceRequest): Promise<[internal.VCustomerPhonebook[], number]> {
        const qb = db.billing.VContractPhonebook.createQueryBuilder('phonebook')
        const searchDto  = new CustomerPhonebookSearchDto()
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
        this.addFilterBy(qb, options.filterBy)
        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(
            result.map(async (d) =>
                d.toInternal(),
            ),
        ), totalCount]
    }

    async readAllFromViewShared(options: CustomerPhonebookOptions, sr: ServiceRequest): Promise<[internal.VCustomerPhonebook[], number]> {
        const qb = db.billing.VContractSharedPhonebook.createQueryBuilder('phonebook')
        const searchDto  = new CustomerPhonebookSearchDto()
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
        this.addFilterBy(qb, options.filterBy)
        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(
            result.map(async (d) =>
                d.toInternal(),
            ),
        ), totalCount]
    }

    async readAllFromViewReseller(options: CustomerPhonebookOptions, sr: ServiceRequest): Promise<[internal.VCustomerPhonebook[], number]> {
        const qb = db.billing.VContractResellerPhonebook.createQueryBuilder('phonebook')
        const searchDto  = new CustomerPhonebookSearchDto()
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
        this.addFilterBy(qb, options.filterBy)
        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(
            result.map(async (d) =>
                d.toInternal(),
            ),
        ), totalCount]
    }

    async readByIdFromViewAll(id: string, options: CustomerPhonebookOptions, sr: ServiceRequest): Promise<internal.VCustomerPhonebook> {
        const qb = db.billing.VContractPhonebook.createQueryBuilder('phonebook')
        const searchDto  = new CustomerPhonebookSearchDto()
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
        this.addFilterBy(qb, options.filterBy)
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    async readByIdFromViewShared(id: string, options: CustomerPhonebookOptions, sr: ServiceRequest): Promise<internal.VCustomerPhonebook> {
        const qb = db.billing.VContractSharedPhonebook.createQueryBuilder('phonebook')
        const searchDto  = new CustomerPhonebookSearchDto()
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
        this.addFilterBy(qb, options.filterBy)
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    async readByIdFromViewReseller(id: string, options: CustomerPhonebookOptions, sr: ServiceRequest): Promise<internal.VCustomerPhonebook> {
        const qb = db.billing.VContractResellerPhonebook.createQueryBuilder('phonebook')
        const searchDto  = new CustomerPhonebookSearchDto()
        configureQueryBuilder(
            qb,
            sr.query,
            new SearchLogic(
                sr,
                Object.keys(searchDto),
                undefined,
                searchDto._alias,
            ))
        qb.where({id: id})
        this.addFilterBy(qb, options.filterBy)
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    private addFilterBy(qb: SelectQueryBuilder<db.billing.ContractPhonebook> | SelectQueryBuilder<db.billing.VContractPhonebook>, filterBy: CustomerPhonebookOptions['filterBy']): void {
        if (filterBy) {
            if (filterBy.customerId) {
                qb.andWhere('phonebook.contract_id = :id', {id: filterBy.customerId})
            }
        }
    }
}
