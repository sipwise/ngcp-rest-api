import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {BaseEntity, SelectQueryBuilder} from 'typeorm'
import {addOrderByToQueryBuilder} from '../../../helpers/query-builder.helper'
import {SearchLogic} from '../../../helpers/search-logic.helper'
import {db, internal} from '../../../entities'
import {LoggerService} from '../../../logger/logger.service'
import {CustomernumberSearchDto} from '../dto/customernumber-search.dto'
import {HandleDbErrors} from '../../../decorators/handle-db-errors.decorator'

export class CustomernumbersMariadbRepository {
    private readonly log = new LoggerService(CustomernumbersMariadbRepository.name)

    @HandleDbErrors
    async readById(customerId: number, sr: ServiceRequest): Promise<internal.CustomerNumber> {
        const qb = await this.createBaseQueryBuilder(sr)
        qb.andWhere('contract.id = :id', {id: customerId})
        const result = await qb.getOneOrFail()
        return result.toInternalCustomerNumber()
    }

    @HandleDbErrors
    async readAll(sr: ServiceRequest): Promise<[internal.CustomerNumber[], number]> {
        const qb = await this.createReadAllQueryBuilder(sr)
        const [result, count] = await qb.getManyAndCount()
        return [result.map(num => num.toInternalCustomerNumber()), count]
    }

    private async createBaseQueryBuilder(sr: ServiceRequest): Promise<SelectQueryBuilder<db.billing.Contract>> {
        const qb = db.billing.Contract.createQueryBuilder('contract')
        qb.innerJoinAndSelect('contract.contact', 'contact')
        qb.innerJoinAndSelect('contract.voipSubscribers', 'billingSubscribers')
        qb.innerJoinAndSelect('billingSubscribers.voipNumbers', 'voipNumbers')
        qb.innerJoinAndSelect('billingSubscribers.provisioningVoipSubscriber', 'provSubscriber')
        qb.innerJoinAndSelect('provSubscriber.dbAliases', 'dbAliases')
        qb.andWhere('concat(voipNumbers.cc,voipNumbers.ac,voipNumbers.sn) = dbAliases.username')

        await this.addPermissionFilterToQueryBuilder(qb, sr)
        return qb
    }

    private async createReadAllQueryBuilder(sr: ServiceRequest): Promise<SelectQueryBuilder<db.billing.Contract>> {
        const searchLogic = new SearchLogic(sr, Object.keys(new CustomernumberSearchDto()))
        const qb = await this.createBaseQueryBuilder(sr)
        await addOrderByToQueryBuilder(qb, sr.query, searchLogic)
        await this.addPaginationToQueryBuilder(qb, searchLogic)
        await this.addSearchFilterToQueryBuilder(qb, sr.query, searchLogic)
        return qb
    }

    private async addSearchFilterToQueryBuilder(qb: SelectQueryBuilder<db.billing.Contract>, params: string[], searchLogic: SearchLogic) {
        const searchFields = [
            {alias: 'dbAliases', property: 'is_primary', searchParam: 'is_primary'},
            {alias: 'dbAliases', property: 'is_devid', searchParam: 'is_devid'},
            {alias: 'billingSubscribers', property: 'id', searchParam: 'subscriber_id'},
            {alias: 'voipNumbers', property: 'id', searchParam: 'number_id'},
            {alias: 'voipNumbers', property: 'cc', searchParam: 'cc'},
            {alias: 'voipNumbers', property: 'ac', searchParam: 'ac'},
            {alias: 'voipNumbers', property: 'sn', searchParam: 'sn'},
        ]
        searchFields.map(field => {
            if (params[field.searchParam] != null) {
                let value: string = params[field.searchParam]

                const whereComparator = value.includes('*') ? 'like' : '='
                value = value.replace(/\*/g, '%')

                if (searchLogic.searchOr) {
                    qb.orWhere(`${field.alias}.${field.property} ${whereComparator} :${field.property}`, {[`${field.property}`]: value})
                } else {
                    qb.andWhere(`${field.alias}.${field.property} ${whereComparator} :${field.property}`, {[`${field.property}`]: value})
                }
            }
        })
    }

    private async addPaginationToQueryBuilder<T extends BaseEntity>(qb: SelectQueryBuilder<T>, searchLogic: SearchLogic) {
        qb.take(searchLogic.rows)
        qb.skip(searchLogic.rows * (searchLogic.page - 1))
    }

    private async addPermissionFilterToQueryBuilder(qb: SelectQueryBuilder<db.billing.Contract>, sr: ServiceRequest) {
        if (sr.user.reseller_id_required) {
            qb.andWhere('contact.reseller_id = :reseller_id', {reseller_id: sr.user.reseller_id})
        }
    }
}