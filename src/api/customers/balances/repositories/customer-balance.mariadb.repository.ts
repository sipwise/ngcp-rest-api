import {Injectable} from '@nestjs/common'
import {SelectQueryBuilder} from 'typeorm'

import {CustomerBalanceSearchDto} from '~/api/customers/balances/dto/customer-balance-search.dto'
import {CustomerBalanceRepository} from '~/api/customers/balances/interfaces/customer-balance.repository'
import {db, internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {FilterBy} from '~/interfaces/filter-by.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

@Injectable()
export class CustomerBalanceMariadbRepository extends MariaDbRepository implements CustomerBalanceRepository {
    private readonly log = new LoggerService(CustomerBalanceMariadbRepository.name)

    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.ContractBalance[], number]> {
        const qb = db.billing.ContractBalance.createQueryBuilder('customerBalance')
        const searchDto  = new CustomerBalanceSearchDto()
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
        qb.innerJoinAndSelect('customerBalance.contract', 'contract')
        qb.innerJoinAndSelect('contract.contact', 'contact')
        this.addFilterBy(qb, filterBy)
        qb.orderBy('customerBalance.id', 'DESC')
        qb.groupBy('customerBalance.contract_id')
        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(
            result.map(async (d) =>
                d.toInternal(),
            ),
        ), totalCount]
    }

    async readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.ContractBalance> {
        const qb = db.billing.ContractBalance.createQueryBuilder('customerBalance')
        const searchDto  = new CustomerBalanceSearchDto()
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
        qb.innerJoinAndSelect('customerBalance.contract', 'contract')
        qb.innerJoinAndSelect('contract.contact', 'contact')
        qb.where({id: id})
        this.addFilterBy(qb, filterBy)
        qb.orderBy('customerBalance.id', 'DESC')
        qb.groupBy('customerBalance.contract_id')
        const result = await qb.getOneOrFail()
        return result.toInternal()
    }

    async readWhereInIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.ContractBalance[]> {
        const qb = db.billing.ContractBalance.createQueryBuilder('customerBalance')
        const searchDto  = new CustomerBalanceSearchDto()
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
        qb.innerJoinAndSelect('customerBalance.contract', 'contract')
        qb.innerJoinAndSelect('contract.contact', 'contact')
        qb.whereInIds(ids)
        this.addFilterBy(qb, filterBy)
        const result = await qb.getMany()
        return await Promise.all(result.map(async (d) => d.toInternal()))
    }

    async update(updates: Dictionary<internal.ContractBalance>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const dbEntity = db.billing.ContractBalance.create()
            dbEntity.fromInternal(updates[id])
            await db.billing.ContractBalance.update(id, dbEntity)
        }
        return ids
    }

    private addFilterBy(qb: SelectQueryBuilder<db.billing.ContractBalance>, filterBy: FilterBy): void {
        if (filterBy) {
            if (filterBy.customerId) {
                qb.andWhere('customerBalance.contract_id = :customerId', {customerId: filterBy.customerId})
            }
            if (filterBy.resellerId) {
                qb.andWhere('contact.reseller_id = :resellerId', {resellerId: filterBy.resellerId})
            }
        }
    }
}
