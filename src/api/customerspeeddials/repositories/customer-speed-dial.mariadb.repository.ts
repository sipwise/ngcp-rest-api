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
import {VoipContractSpeedDial} from 'entities/db/provisioning'

interface FilterBy {
    customerId?: number
    resellerId?: number
}

interface IsPilot {
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
    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.CustomerSpeedDial[], number]> {
        const qb = db.provisioning.VoipContractSpeedDial.createQueryBuilder('voipContractSpeedDial')
        const searchDto  = new CustomerSpeedDialSearchDto()
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
            undefined,
            searchDto._alias
        ))
        this.addFilterBy(qb, filterBy)
        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(
                    result.map(async (d) =>
                        d.toInternal()
                    )
                ), totalCount]
    }

    @HandleDbErrors
    async readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.CustomerSpeedDial> {
        const qb = db.provisioning.VoipContractSpeedDial.createQueryBuilder('voipContractSpeedDial')
        const searchDto  = new CustomerSpeedDialSearchDto()
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr,
            Object.keys(searchDto),
            undefined,
            searchDto._alias
        ))
        qb.where({ id: id })
        this.addFilterBy(qb, filterBy)
        const result = await qb.getOne()
        if (!result)
            throw new NotFoundException()
        return result.toInternal()
    }

    @HandleDbErrors
    async update(id: number, entity: internal.CustomerSpeedDial, sr: ServiceRequest): Promise<internal.CustomerSpeedDial> {
        const dbCSD = db.provisioning.VoipContractSpeedDial.create()
        dbCSD.fromInternal(entity)
        await db.provisioning.VoipContractSpeedDial.update(id, dbCSD)
        return this.readById(id, sr)
    }

    @HandleDbErrors
    async delete(id: number, sr: ServiceRequest): Promise<number> {
        await db.provisioning.VoipContractSpeedDial.findOneByOrFail({ id: id })
        await db.provisioning.VoipContractSpeedDial.delete({ id: id })

        return 1
    }

    @HandleDbErrors
    async checkCustomerExistsAndCustomerReseller(customer_id: number, reseller_id: number, check_reseller: boolean): Promise<boolean> {
        const contract = await db.billing.Contract.findOne({
            where: {
                id: customer_id
            },
            relations: [
                'contact'
            ]
        })
        if (!contract)
            return false
        if (check_reseller && contract.contact.reseller_id != reseller_id)
            return false
        return true
    }

    @HandleDbErrors
    async readSubscriberDomain(customer_id: number, isPilot: IsPilot): Promise<string> {
        const subscriber = await db.provisioning.VoipSubscriber.findOne({
            where: {
                account_id: customer_id,
                is_pbx_pilot: isPilot.isPilot
            },
            relations: [
                'domain'
            ]
        })
        if (subscriber)
            return subscriber.domain.domain

        return undefined
    }

    private addFilterBy(qb: SelectQueryBuilder<db.provisioning.VoipContractSpeedDial>, filterBy: FilterBy): void {
        if (filterBy) {
            if (filterBy.customerId) {
                qb.andWhere({ contract_id: filterBy.customerId })
            }
            if (filterBy.resellerId) {
                qb.innerJoin('voipContractSpeedDial.contract', 'contract')
                qb.innerJoin('contract.contact', 'contact')
                qb.andWhere('contact.reseller_id = :id', { id: filterBy.resellerId })
            }
        }
    }
}
