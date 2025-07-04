import {Injectable, MethodNotAllowedException} from '@nestjs/common'
import {IsNull, Not} from 'typeorm'

import {ContractSearchDto} from '~/api/contracts/dto/contract-search.dto'
import {ContractRepository} from '~/api/contracts/interfaces/contract.respository'
import {db, internal} from '~/entities'
import {ContactStatus} from '~/entities/internal/contact.internal.entity'
import {ProductClass} from '~/entities/internal/product.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

@Injectable()
export class ContractMariadbRepository extends MariaDbRepository implements ContractRepository {
    private readonly log = new LoggerService(ContractMariadbRepository.name)

    async create(contracts: internal.Contract[], _sr: ServiceRequest): Promise<number[]> {
        const qb = db.billing.Contract.createQueryBuilder('contract')
        const values = contracts.map(contract => new db.billing.Contract().fromInternal(contract))
        const result = await qb.insert().values(values).execute()
        return result.identifiers.map((obj: {id: number}) => obj.id)
    }

    async delete(_id: number, _sr: ServiceRequest): Promise<number> {
        throw new MethodNotAllowedException()
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Contract> {
        this.log.debug({
            message: 'read contract by id',
            func: this.read.name,
            user: sr.user.username,
            id: id,
        })
        return (await db.billing.Contract.findOneByOrFail({id: id})).toInternal()
    }

    async readActiveSystemContact(id: number, sr: ServiceRequest): Promise<internal.Contact> {
        this.log.debug({
            message: 'read active system contact by id',
            func: this.readActiveSystemContact.name,
            user: sr.user.username,
            id: id,
        })
        const contact = await db.billing.Contact.findOneBy({
            id: id,
            status: Not<ContactStatus.Terminated>(ContactStatus.Terminated),
            reseller_id: IsNull(),
        })
        return contact != undefined ? contact.toInternal() : undefined
    }

    async readProductByType(type: string, sr: ServiceRequest): Promise<internal.Product> {
        this.log.debug({
            message: 'read product by type',
            func: this.readProductByType.name,
            user: sr.user.username,
            type: type,
        })
        const product = await db.billing.Product.findOneBy({class: <ProductClass>type})
        return product != undefined ? product.toInternal() : undefined
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Contract[], number]> {
        this.log.debug({
            message: 'read all contracts',
            func: this.readAll.name,
            user: sr.user.username,
        })
        const queryBuilder = db.billing.Contract.createQueryBuilder('contract')
        const searchDto = new ContractSearchDto()
        await configureQueryBuilder(
            queryBuilder,
            sr.query,
            new SearchLogic(
                sr,
                Object.keys(searchDto),
                undefined,
                searchDto._alias,
            ),
        )
        queryBuilder.leftJoinAndSelect('contract.product', 'product')
        const [result, totalCount] = await queryBuilder.getManyAndCount()
        return [result.map(r => r.toInternal()), totalCount]
    }

    async readWhereInIds(ids: number[], sr: ServiceRequest): Promise<internal.Contract[]> {
        const qb = db.billing.Contract.createQueryBuilder('contract')
        const searchDto = new ContractSearchDto()
        await configureQueryBuilder(
            qb,
            sr.query,
            new SearchLogic(
                sr,
                Object.keys(searchDto),
                undefined,
                searchDto._alias,
            ),
        )
        qb.leftJoinAndSelect('contract.product', 'product')
        const created = await qb.andWhereInIds(ids).getMany()
        return await Promise.all(created.map(async (contract) => contract.toInternal()))
    }

    async update(updates: Dictionary<internal.Contract>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const update = new db.billing.Contract().fromInternal(updates[id])
            Object.keys(update).map(key => {
                if (update[key] == undefined)
                    delete update[key]
            })
            update.modify_timestamp = new Date(Date.now())
            await db.billing.Contract.update(id, update)
        }
        return ids
    }
}
