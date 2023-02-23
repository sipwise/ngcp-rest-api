import {Injectable, NotFoundException} from '@nestjs/common'
import {db, internal} from '../../../entities'
import {HandleDbErrors} from '../../../decorators/handle-db-errors.decorator'
import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {CustomerSpeedDialSearchDto} from '../dto/customer-speed-dial-search.dto'
import {configureQueryBuilder} from '../../../helpers/query-builder.helper'
import {CustomerSpeedDialRepository} from '../interfaces/customer-speed-dial.repository'
import {SearchLogic} from '../../../helpers/search-logic.helper'
import {LoggerService} from '../../../logger/logger.service'
import {SelectQueryBuilder} from 'typeorm'
import {FilterBy} from '../../../interfaces/filter-by.interface'
import {Dictionary} from '../../../helpers/dictionary.helper'

interface SpeedDialOptions {
    isPilot: boolean
}

@Injectable()
export class CustomerSpeedDialMariadbRepository implements CustomerSpeedDialRepository {
    private readonly log = new LoggerService(CustomerSpeedDialMariadbRepository.name)

    @HandleDbErrors
    async create(entity: internal.CustomerSpeedDial, sr: ServiceRequest): Promise<internal.CustomerSpeedDial> {
        const dbCSD = db.provisioning.VoipContractSpeedDial.create()
        dbCSD.fromInternal(entity)

        await db.provisioning.VoipContractSpeedDial.insert(dbCSD)

        return dbCSD.toInternal()
    }

    @HandleDbErrors
    async createMany(entities: internal.CustomerSpeedDial[], sr: ServiceRequest): Promise<number[]> {
        const qb = db.provisioning.VoipContractSpeedDial.createQueryBuilder('csd')
        const values = entities.map(csd => new db.provisioning.VoipContractSpeedDial().fromInternal(csd))
        const result = await qb.insert().values(values).execute()
        return result.identifiers.map(obj => obj.id)
    }

    @HandleDbErrors
    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.CustomerSpeedDial[], number]> {
        const qb = db.provisioning.VoipContractSpeedDial.createQueryBuilder('voipContractSpeedDial')
        const searchDto = new CustomerSpeedDialSearchDto()
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
            undefined,
            searchDto._alias,
        ))
        this.addFilterBy(qb, filterBy)
        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(
            result.map(async (d) =>
                d.toInternal(),
            ),
        ), totalCount]
    }

    @HandleDbErrors
    async readWhereInIds(ids: number[], sr: ServiceRequest): Promise<internal.CustomerSpeedDial[]> {
        const qb = db.provisioning.VoipContractSpeedDial.createQueryBuilder('voipContractSpeedDial')
        const searchDto = new CustomerSpeedDialSearchDto()
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
            undefined,
            searchDto._alias,
        ))
        const created = await qb.andWhereInIds(ids).getMany()
        return await Promise.all(created.map(async (csd) => csd.toInternal()))
    }

    @HandleDbErrors
    async readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.CustomerSpeedDial> {
        const qb = db.provisioning.VoipContractSpeedDial.createQueryBuilder('voipContractSpeedDial')
        const searchDto = new CustomerSpeedDialSearchDto()
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
            undefined,
            searchDto._alias,
        ))
        qb.where({id: id})
        this.addFilterBy(qb, filterBy)
        const result = await qb.getOne()
        if (!result)
            throw new NotFoundException()
        return result.toInternal()
    }

    @HandleDbErrors
    async update(updates: Dictionary<internal.CustomerSpeedDial>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const dbCSD = db.provisioning.VoipContractSpeedDial.create()
            dbCSD.fromInternal(updates[id])
            await db.provisioning.VoipContractSpeedDial.update(id, dbCSD)
        }
        return ids
    }

    @HandleDbErrors
    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        const qb = db.provisioning.VoipContractSpeedDial.createQueryBuilder('csd').delete()
        qb.andWhereInIds(ids)
        await qb.execute()
        return ids
    }

    @HandleDbErrors
    async checkCustomerExistsAndCustomerReseller(customerId: number, resellerId: number, checkReseller: boolean): Promise<boolean> {
        const contract = await db.billing.Contract.findOne({
            where: {
                id: customerId,
            },
            relations: [
                'contact',
            ],
        })
        if (!contract)
            return false
        if (checkReseller && contract.contact.reseller_id != resellerId)
            return false
        return true
    }

    @HandleDbErrors
    async readSubscriberDomain(customerId: number, options: SpeedDialOptions): Promise<string> {
        const subscriber = await db.provisioning.VoipSubscriber.findOne({
            where: {
                account_id: customerId,
                is_pbx_pilot: options.isPilot,
            },
            relations: [
                'domain',
            ],
        })
        if (subscriber)
            return subscriber.domain.domain

        return undefined
    }

    private addFilterBy(qb: SelectQueryBuilder<db.provisioning.VoipContractSpeedDial>, filterBy: FilterBy): void {
        if (filterBy) {
            if (filterBy.customerId) {
                qb.andWhere({contract_id: filterBy.customerId})
            }
            if (filterBy.resellerId) {
                qb.innerJoin('voipContractSpeedDial.contract', 'contract')
                qb.innerJoin('contract.contact', 'contact')
                qb.andWhere('contact.reseller_id = :id', {id: filterBy.resellerId})
            }
        }
    }
}
