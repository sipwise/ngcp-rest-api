import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {BaseEntity, EntityNotFoundError, SelectQueryBuilder} from 'typeorm'
import {addOrderByToQueryBuilder} from '../../../helpers/query-builder.helper'
import {SearchLogic} from '../../../helpers/search-logic.helper'
import {db, internal} from '../../../entities'
import {LoggerService} from '../../../logger/logger.service'
import {CustomerNumberSearchDto} from '../dto/customer-number-search.dto'
import {HandleDbErrors} from '../../../decorators/handle-db-errors.decorator'
import {AppService} from '../../../app.service'
import {Injectable} from '@nestjs/common'

interface RawCustomerNumberRow {
    contract_id: number
    billingSubscriber_id: number
    voipNumber_id: number
    voipNumber_cc: number
    voipNumber_ac: string
    voipNumber_sn: string
    is_primary: number
    is_devid: number
}

interface FilterBy {
    customerId?: number
    resellerId?: number
}

@Injectable()
export class CustomerNumberMariadbRepository {
    private readonly log = new LoggerService(CustomerNumberMariadbRepository.name)

    constructor(
        private readonly app: AppService,
    ) {
    }

    @HandleDbErrors
    async readById(customerId: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.CustomerNumber> {
        const qb = this.createBaseQueryBuilder(sr, filterBy)
        const searchLogic = new SearchLogic(sr, Object.keys(new CustomerNumberSearchDto()))
        await this.addSearchFilterToQueryBuilder(qb, sr.query, searchLogic)
        qb.andWhere('contract.id = :contractId', {contractId: customerId})
        const rawResult: RawCustomerNumberRow[] = await qb.getRawMany()
        if (rawResult.length == 0)
            throw new EntityNotFoundError(db.billing.Contract, '')
        const transformed = this.transformRawCustomerNumberRows(rawResult)
        return internal.CustomerNumber.create({id: customerId, numbers: transformed[customerId]})
    }

    @HandleDbErrors
    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.CustomerNumber[], number]> {
        const qb = this.createReadAllQueryBuilder(sr, filterBy)

        const resultRawEntity = await qb.getRawAndEntities()
        const result: RawCustomerNumberRow[] = resultRawEntity.raw
        const count = await qb.getCount()

        const transformed = this.transformRawCustomerNumberRows(result)

        const customerNumbers: internal.CustomerNumber[] = []
        for (const id in transformed) {
            customerNumbers.push(internal.CustomerNumber.create({id: +id, numbers: transformed[+id]}))
        }
        return [customerNumbers, count]
    }

    /**
     * Takes an array of `RawCustomerNumberRow` and returns a hash where the key is the contract ID and the value is an
     * array of subscribers belonging to that ID.
     * @param customerNumbers
     * @private
     */
    private transformRawCustomerNumberRows(customerNumbers: RawCustomerNumberRow[]): { [id: number]: internal.SubscriberNumber[] } {
        const transformed = {}
        customerNumbers.forEach(obj => {
            if (transformed[obj.contract_id] == undefined) {
                transformed[obj.contract_id] = []
            }
            transformed[obj.contract_id].push(internal.SubscriberNumber.create({
                id: obj.billingSubscriber_id,
                sn: obj.voipNumber_sn,
                ac: obj.voipNumber_ac,
                cc: obj.voipNumber_cc,
                isDevID: obj.is_devid == 1,
                isPrimary: obj.is_primary == 1,
                numberID: obj.voipNumber_id,
            }))
        })
        return transformed
    }

    private createBaseQueryBuilder(sr: ServiceRequest, filterBy: FilterBy): SelectQueryBuilder<db.billing.Contract> {
        const qb = db.billing.Contract.createQueryBuilder('contract')
        qb.innerJoinAndSelect('contract.contact', 'contact')
        qb.innerJoinAndSelect('contract.voipSubscribers', 'billingSubscriber')
        qb.innerJoinAndSelect('billingSubscriber.voipNumbers', 'voipNumber')
        qb.innerJoinAndSelect(
            sqb => sqb
                .select(['is_primary', 'is_devid', 'username'])
                .from(db.provisioning.VoipDBAlias, 'vdba'),
            'dbAlias',
            'dbAlias.username = CONCAT(voipNumber.cc, voipNumber.ac, voipNumber.sn)',
        )
        this.addPermissionFilterToQueryBuilder(qb, filterBy)
        return qb
    }

    private createReadAllQueryBuilder(sr: ServiceRequest, filterBy: FilterBy): SelectQueryBuilder<db.billing.Contract> {
        const searchLogic = new SearchLogic(sr, Object.keys(new CustomerNumberSearchDto()))
        const qb = this.createBaseQueryBuilder(sr, filterBy)
        this.addSearchFilterToQueryBuilder(qb, sr.query, searchLogic)
        addOrderByToQueryBuilder(qb, sr.query, searchLogic)
        this.addPaginationToQueryBuilder(qb, searchLogic)
        return qb
    }

    private addSearchFilterToQueryBuilder(qb: SelectQueryBuilder<db.billing.Contract>, params: string[], searchLogic: SearchLogic): void {
        const searchFields = [
            {alias: 'dbAlias', property: 'is_primary', searchParam: 'is_primary'},
            {alias: 'dbAlias', property: 'is_devid', searchParam: 'is_devid'},
            {alias: 'billingSubscriber', property: 'id', searchParam: 'subscriber_id'},
            {alias: 'voipNumber', property: 'id', searchParam: 'number_id'},
            {alias: 'voipNumber', property: 'cc', searchParam: 'cc'},
            {alias: 'voipNumber', property: 'ac', searchParam: 'ac'},
            {alias: 'voipNumber', property: 'sn', searchParam: 'sn'},
        ]
        searchFields.map(field => {
            if (params[field.searchParam] != null) {
                const parameter: string = params[field.searchParam]
                let whereComparator = '='
                let value: string | number | boolean

                if (!isNaN(parseInt(parameter))) {
                    value = parseInt(parameter)
                } else if (parameter.toLowerCase() === 'true' || parameter.toLowerCase() === 'false') {
                    value = parameter.toLowerCase() === 'true'
                } else {
                    whereComparator = parameter.includes('*') ? 'like' : '='
                    value = parameter.replace(/\*/g, '%')
                }

                if (searchLogic.searchOr) {
                    qb.orWhere(`${field.alias}.${field.property} ${whereComparator} :${field.property}`, {[`${field.property}`]: value})
                } else {
                    qb.andWhere(`${field.alias}.${field.property} ${whereComparator} :${field.property}`, {[`${field.property}`]: value})
                }
            }
        })
    }

    private addPaginationToQueryBuilder<T extends BaseEntity>(qb: SelectQueryBuilder<T>, searchLogic: SearchLogic): void {
        qb.take(searchLogic.rows)
        qb.skip(searchLogic.rows * (searchLogic.page - 1))
    }

    private addPermissionFilterToQueryBuilder(qb: SelectQueryBuilder<db.billing.Contract>, filterBy: FilterBy): void {
        if (filterBy) {
            if (filterBy.resellerId) {
                qb.andWhere('contact.reseller_id = :reseller_id', {reseller_id: filterBy.resellerId})
            }
            if (filterBy.customerId) {
                qb.andWhere('contract.id = :customerId', {customerId: filterBy.customerId})
            }
        }
    }
}