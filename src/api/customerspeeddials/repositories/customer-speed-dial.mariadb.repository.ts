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
        const dbCSD = await db.provisioning.VoipContractSpeedDial.fromInternal(entity)

        await db.provisioning.VoipContractSpeedDial.insert(dbCSD)

        return db.provisioning.VoipContractSpeedDial.toInternal(dbCSD)
    }

    @HandleDbErrors
    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.CustomerSpeedDial[], number]> {
        const qb = await this.createBaseQueryBuilder(sr)
        await configureQueryBuilder(qb, sr.query, new SearchLogic(sr,
            Object.keys(new CustomerSpeedDialSearchDto()),
        ))
        this.addFilterBy(qb, filterBy)
        const result = await qb.getRawMany<db.provisioning.VoipContractSpeedDial>()
        const totalCount = await qb.getCount()
        return [await Promise.all(
                    result.map(async (d) =>
                        db.provisioning.VoipContractSpeedDial.rawToInternal(d)
                    )
                ), totalCount]
    }

    @HandleDbErrors
    async readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.CustomerSpeedDial> {
        const qb = await this.createBaseQueryBuilder(sr)
        qb.where({ contract_id: id })
        this.addFilterBy(qb, filterBy)
        const result = await qb.getRawOne<db.provisioning.VoipContractSpeedDial>()
        if (!result)
            throw new NotFoundException()
        return await db.provisioning.VoipContractSpeedDial.rawToInternal(result)
    }

    @HandleDbErrors
    async update(id: number, entity: internal.CustomerSpeedDial, sr: ServiceRequest): Promise<internal.CustomerSpeedDial> {
        const update = await db.provisioning.VoipContractSpeedDial.fromInternal(entity)
        await db.provisioning.VoipContractSpeedDial.delete({ contract_id: id })
        await Promise.all(update.map(async (entry) => {
            await db.provisioning.VoipContractSpeedDial.insert(entry)
        }))
        return await db.provisioning.VoipContractSpeedDial.toInternal(update)
    }

    @HandleDbErrors
    async delete(id: number, sr: ServiceRequest): Promise<number> {
        await db.provisioning.VoipContractSpeedDial.findOneByOrFail({ contract_id: id })
        await db.provisioning.VoipContractSpeedDial.delete({ contract_id: id })

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
                qb.innerJoin('csd.contract', 'contract')
                qb.innerJoin('contract.contact', 'contact')
                qb.andWhere('contact.reseller_id = :id', { id: filterBy.resellerId })
            }
        }
    }

    private async createBaseQueryBuilder(sr: ServiceRequest): Promise<SelectQueryBuilder<db.provisioning.VoipContractSpeedDial>> {
        const qb = db.provisioning.VoipContractSpeedDial.createQueryBuilder('csd')
        qb.select('csd.contract_id', 'contract_id')
        qb.addSelect('JSON_ARRAYAGG( \
                        JSON_OBJECT( \
                            "slot", csd.slot, "destination", csd.destination \
                        ) \
                     )',
                     'speeddials')
        qb.groupBy('contract_id')
        return qb
    }
}
