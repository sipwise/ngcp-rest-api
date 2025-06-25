import {Injectable} from '@nestjs/common'
import {EntityManager, SelectQueryBuilder} from 'typeorm'

import {SubscriberPhonebookSearchDto} from '~/api/subscribers/phonebook/dto/subscriber-phonebook-search.dto'
import {SubscriberPhonebookOptions} from '~/api/subscribers/phonebook/interfaces/subscriber-phonebook-options.interface'
import {db, internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

@Injectable()
export class SubscriberPhonebookMariadbRepository extends MariaDbRepository implements SubscriberPhonebookMariadbRepository {
    private readonly log = new LoggerService(SubscriberPhonebookMariadbRepository.name)

    async create(entities: internal.SubscriberPhonebook[], _sr: ServiceRequest, manager?: EntityManager): Promise<number[]> {
        const qb = manager ? manager.createQueryBuilder(db.billing.SubscriberPhonebook, 'phonebook')
            : db.billing.SubscriberPhonebook.createQueryBuilder('phonebook')
        const values = await Promise.all(entities.map(async entity => new db.billing.SubscriberPhonebook().fromInternal(entity)))
        const result = await qb.insert().values(values).execute()

        return await Promise.all(result.identifiers.map(async (obj: {id: number}) => obj.id))
    }

    async readAll(options: SubscriberPhonebookOptions, sr: ServiceRequest): Promise<[internal.SubscriberPhonebook[], number]> {
        const qb = db.billing.SubscriberPhonebook.createQueryBuilder('phonebook')
        qb.leftJoinAndSelect('phonebook.subscriber', 'subscriber')
        const searchDto  = new SubscriberPhonebookSearchDto()
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

    async readById(id: number, options: SubscriberPhonebookOptions, sr: ServiceRequest): Promise<internal.SubscriberPhonebook> {
        const qb = db.billing.SubscriberPhonebook.createQueryBuilder('phonebook')
        qb.leftJoinAndSelect('phonebook.subscriber', 'subscriber')
        const searchDto  = new SubscriberPhonebookSearchDto()
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

    async update(updates: Dictionary<internal.SubscriberPhonebook>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const dbEntity = db.billing.SubscriberPhonebook.create()
            dbEntity.fromInternal(updates[id])
            await db.billing.SubscriberPhonebook.update(id, dbEntity)
        }
        return ids
    }

    async purge(subscriberId: number, _sr: ServiceRequest, manager?: EntityManager): Promise<number> {
        if (!manager) {
            await db.billing.SubscriberPhonebook.delete({subscriber_id: subscriberId})
            return subscriberId
        }

        await manager.delete(db.billing.SubscriberPhonebook, {subscriber_id: subscriberId})
        return subscriberId
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        await db.billing.SubscriberPhonebook.delete(ids)
        return ids
    }

    async readWhereInIds(ids: number[], options: SubscriberPhonebookOptions, sr: ServiceRequest): Promise<internal.SubscriberPhonebook[]> {
        const qb = db.billing.SubscriberPhonebook.createQueryBuilder('phonebook')
        qb.leftJoinAndSelect('phonebook.subscriber', 'subscriber')
        const searchDto  = new SubscriberPhonebookSearchDto()
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
        this.addFilterBy(qb, options.filterBy)
        const result = await qb.getMany()
        return await Promise.all(result.map(async (d) => d.toInternal()))
    }

    async readWhereInNumbers(number: string[], options: SubscriberPhonebookOptions, sr: ServiceRequest): Promise<number[]> {
        const qb = db.billing.SubscriberPhonebook.createQueryBuilder('phonebook')
        qb.leftJoinAndSelect('phonebook.subscriber', 'subscriber')
        const searchDto  = new SubscriberPhonebookSearchDto()
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
        qb.andWhere('phonebook.number IN (:...numbers)', {numbers: number})
        this.addFilterBy(qb, options.filterBy)
        const result = await qb.getMany()
        return await Promise.all(result.map(async (d) => d.id))
    }

    async readCountOfIds(ids: number[], options: SubscriberPhonebookOptions, sr: ServiceRequest): Promise<number> {
        const qb = db.billing.SubscriberPhonebook.createQueryBuilder('phonebook')
        qb.leftJoinAndSelect('phonebook.subscriber', 'subscriber')
        const searchDto = new SubscriberPhonebookSearchDto()
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

    async readAllFromViewAll(options: SubscriberPhonebookOptions, sr: ServiceRequest): Promise<[internal.VSubscriberPhonebook[], number]> {
        const qb = db.billing.VSubscriberPhonebook.createQueryBuilder('phonebook')
        qb.leftJoinAndSelect('phonebook.subscriber', 'subscriber')
        const searchDto  = new SubscriberPhonebookSearchDto()
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

    async readAllFromViewContract(options: SubscriberPhonebookOptions, sr: ServiceRequest): Promise<[internal.VSubscriberPhonebook[], number]> {
        const qb = db.billing.VSubscriberContractPhonebook.createQueryBuilder('phonebook')
        qb.leftJoinAndSelect('phonebook.subscriber', 'subscriber')
        const searchDto  = new SubscriberPhonebookSearchDto()
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

    async readAllFromViewReseller(options: SubscriberPhonebookOptions, sr: ServiceRequest): Promise<[internal.VSubscriberPhonebook[], number]> {
        const qb = db.billing.VSubscriberResellerPhonebook.createQueryBuilder('phonebook')
        qb.leftJoinAndSelect('phonebook.subscriber', 'subscriber')
        const searchDto  = new SubscriberPhonebookSearchDto()
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

    async readByIdFromViewAll(id: string, options: SubscriberPhonebookOptions, sr: ServiceRequest): Promise<internal.VSubscriberPhonebook> {
        const qb = db.billing.VSubscriberPhonebook.createQueryBuilder('phonebook')
        qb.leftJoinAndSelect('phonebook.subscriber', 'subscriber')
        const searchDto  = new SubscriberPhonebookSearchDto()
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

    async readByIdFromViewContract(id: string, options: SubscriberPhonebookOptions, sr: ServiceRequest): Promise<internal.VSubscriberPhonebook> {
        const qb = db.billing.VSubscriberContractPhonebook.createQueryBuilder('phonebook')
        const searchDto  = new SubscriberPhonebookSearchDto()
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

    async readByIdFromViewReseller(id: string, options: SubscriberPhonebookOptions, sr: ServiceRequest): Promise<internal.VSubscriberPhonebook> {
        const qb = db.billing.VSubscriberResellerPhonebook.createQueryBuilder('phonebook')
        qb.leftJoinAndSelect('phonebook.subscriber', 'subscriber')
        const searchDto  = new SubscriberPhonebookSearchDto()
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

    private addFilterBy(qb: SelectQueryBuilder<db.billing.SubscriberPhonebook> | SelectQueryBuilder<db.billing.VSubscriberPhonebook>, filterBy: SubscriberPhonebookOptions['filterBy']): void {
        if (filterBy) {
            if (filterBy.resellerId) {
                qb.leftJoinAndSelect('subscriber.contract', 'contract')
                qb.leftJoinAndSelect('contract.contact', 'contact')
                qb.andWhere('contact.reseller_id = :resellerId', {resellerId: filterBy.resellerId})
            }
            if (filterBy.subscriber_id) {
                qb.andWhere('phonebook.subscriber_id = :id', {id: filterBy.subscriber_id})
            }
        }
    }
}
