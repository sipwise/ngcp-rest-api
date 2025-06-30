import {Injectable, NotFoundException} from '@nestjs/common'
import {SelectQueryBuilder} from 'typeorm'

import {CustomerSpeedDialSearchDto} from '~/api/customerspeeddials/dto/customer-speed-dial-search.dto'
import {CustomerSpeedDialRepository} from '~/api/customerspeeddials/interfaces/customer-speed-dial.repository'
import {db, internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {FilterBy} from '~/interfaces/filter-by.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

interface SpeedDialOptions {
    isPilot: boolean
}

@Injectable()
export class CustomerSpeedDialMariadbRepository extends MariaDbRepository implements CustomerSpeedDialRepository {
    private readonly log = new LoggerService(CustomerSpeedDialMariadbRepository.name)

    async create(entities: internal.CustomerSpeedDial[], _sr: ServiceRequest): Promise<number[]> {
        const qb = db.provisioning.VoipContractSpeedDial.createQueryBuilder('csd')
        const values = entities.map(csd => new db.provisioning.VoipContractSpeedDial().fromInternal(csd))
        const result = await qb.insert().values(values).execute()
        return result.identifiers.map((obj: {id: number}) => obj.id)
    }

    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.CustomerSpeedDial[], number]> {
        const qb = db.provisioning.VoipContractSpeedDial.createQueryBuilder('csd')
        const searchDto = new CustomerSpeedDialSearchDto()
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
        this.addFilterBy(qb, filterBy)
        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(
            result.map(async (d) =>
                d.toInternal(),
            ),
        ), totalCount]
    }

    async readWhereInIds(ids: number[], sr: ServiceRequest): Promise<internal.CustomerSpeedDial[]> {
        const qb = db.provisioning.VoipContractSpeedDial.createQueryBuilder('csd')
        const searchDto = new CustomerSpeedDialSearchDto()
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
        const created = await qb.andWhereInIds(ids).getMany()
        return await Promise.all(created.map(async (csd) => csd.toInternal()))
    }

    async readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.CustomerSpeedDial> {
        const qb = db.provisioning.VoipContractSpeedDial.createQueryBuilder('csd')
        const searchDto = new CustomerSpeedDialSearchDto()
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
        this.addFilterBy(qb, filterBy)
        const result = await qb.getOne()
        if (!result)
            throw new NotFoundException()
        return result.toInternal()
    }

    async update(updates: Dictionary<internal.CustomerSpeedDial>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const dbCSD = db.provisioning.VoipContractSpeedDial.create()
            dbCSD.fromInternal(updates[id])
            await db.provisioning.VoipContractSpeedDial.update(id, dbCSD)
        }
        return ids
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        await db.provisioning.VoipContractSpeedDial.delete(ids)
        return ids
    }

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
