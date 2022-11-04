import {Injectable} from '@nestjs/common'
import {db, internal} from '../../../entities'
import {HandleDbErrors} from '../../../decorators/handle-db-errors.decorator'
import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {CustomerSpeedDialSearchDto} from '../dto/customer-speed-dial-search.dto'
import {configureQueryBuilder} from '../../../helpers/query-builder.helper'
import {CustomerSpeedDialRepository} from '../interfaces/customer-speed-dial.repository'
import {SearchLogic} from '../../../helpers/search-logic.helper'
import {LoggerService} from '../../../logger/logger.service'
import {ObjectLiteral, SelectQueryBuilder} from 'typeorm'

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
    async create(entity: internal.CustomerSpeedDial, sr: ServiceRequest): Promise<internal.Domain> {
        const dbCSD = db.provisioning.VoipContractSpeedDial.create()
        dbCSD.fromInternal(entity)

        await db.provisioning.VoipContractSpeedDial.insert(dbCSD)

        return dbCSD.toInternal()
    }

    @HandleDbErrors
    async readAll(req: ServiceRequest, filterBy?: FilterBy): Promise<[internal.CustomerSpeedDial[], number]> {
        const qb = db.provisioning.VoipContractSpeedDial.createQueryBuilder('voip_contract_speed_dial')
        const searchKeys = Object.keys(new CustomerSpeedDialSearchDto())
        await configureQueryBuilder(qb, req.query, new SearchLogic(req, searchKeys))
        await this.addFilterBy(qb, filterBy)
        const [result, totalCount] = await qb.getManyAndCount()
        return [result.map(d => d.toInternal()), totalCount]
    }

    @HandleDbErrors
    async readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.CustomerSpeedDial> {
        const qb = db.provisioning.VoipContractSpeedDial.createQueryBuilder('voip_contract_speed_dial')
        qb.where({ id: id })
        await this.addFilterBy(qb, filterBy)
        return (await qb.getOneOrFail()).toInternal()
    }

    @HandleDbErrors
    async update(id: number, entity: internal.CustomerSpeedDial, sr: ServiceRequest): Promise<internal.CustomerSpeedDial> {
        await db.provisioning.VoipContractSpeedDial.findOneByOrFail({ id: id })
        const update = new db.provisioning.VoipContractSpeedDial().fromInternal(entity)
        Object.keys(update).map(key => {
            if (update[key] == undefined)
                delete update[key]
        })
        await db.provisioning.VoipContractSpeedDial.update(id, update)

        return update.toInternal()
    }

    @HandleDbErrors
    async delete(id: number, sr: ServiceRequest): Promise<number> {
        await db.provisioning.VoipContractSpeedDial.findOneByOrFail({ id: id })
        await db.provisioning.VoipContractSpeedDial.delete(id)

        return 1
    }

    @HandleDbErrors
    async checkCustomerExistsAndCustomerReseller(customer_id: number, reseller_id: number, check_reseller: boolean): Promise<boolean> {
        const contract = await db.billing.Contract.findOneOrFail({
            where: {
                id: customer_id
            },
            relations: [
                'contact'
            ]
        })
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

    private async addFilterBy(qb: SelectQueryBuilder<db.provisioning.VoipContractSpeedDial>, filterBy: FilterBy): Promise<void> {
        if (filterBy) {
            if (filterBy.customerId) {
                qb.andWhere({ contract_id: filterBy.customerId })
            }
            if (filterBy.resellerId) {
                qb.innerJoin('voip_contract_speed_dial.contract', 'contract')
                qb.innerJoin('contract.contact', 'contact')
                qb.andWhere("contact.reseller_id = :id", { id: filterBy.resellerId })
            }
        }
    }
}
