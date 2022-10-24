import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {BaseEntity, EntityNotFoundError, SelectQueryBuilder} from 'typeorm'
import {addOrderByToQueryBuilder} from '../../../helpers/query-builder.helper'
import {SearchLogic} from '../../../helpers/search-logic.helper'
import {db, internal} from '../../../entities'
import {LoggerService} from '../../../logger/logger.service'
import {CustomernumberSearchDto} from '../dto/customernumber-search.dto'
import {HandleDbErrors} from '../../../decorators/handle-db-errors.decorator'
import {AppService} from '../../../app.service'
import {Injectable} from '@nestjs/common'

interface RawCustomerNumberRow {
    id: number
    subscriber_id: number
    number_id: number
    cc: number
    ac: string
    sn: string
    is_primary: number
    is_devid: number
}

@Injectable()
export class CustomernumbersMariadbRepository {
    private readonly log = new LoggerService(CustomernumbersMariadbRepository.name)

    constructor(
        private readonly app: AppService,
    ) {
    }

    @HandleDbErrors
    async readById(customerId: number, sr: ServiceRequest): Promise<internal.CustomerNumber> {
        let rawQuery = this.getBaseRawQueryOne(customerId)
        if (sr.user.reseller_id_required)
            rawQuery = `${rawQuery} and contact.reseller_id = ${sr.user.reseller_id}`
        const rawResult: RawCustomerNumberRow[] = await this.app.dbConnection().query(rawQuery)
        if (rawResult.length == 0)
            throw new EntityNotFoundError(db.billing.Contract, '')
        const transformed = this.transformRawCustomerNumberRows(rawResult)
        return internal.CustomerNumber.create({id: customerId, numbers: transformed[customerId]})
    }

    @HandleDbErrors
    async readAll(sr: ServiceRequest): Promise<[internal.CustomerNumber[], number]> {
        const qb = await this.createReadAllQueryBuilder(sr)
        const [result, count] = await qb.getManyAndCount()

        const rawQuery = this.getBaseRawQueryMany(result.map(contract => contract.id))
        const rawQueryWithFilter = this.appendSearchFilterToRawQuery(rawQuery, sr.query, new SearchLogic(sr, Object.keys(new CustomernumberSearchDto())))

        const rawResult: RawCustomerNumberRow[] = await this.app.dbConnection().query(rawQueryWithFilter + ' order by c.id;')
        const transformed = this.transformRawCustomerNumberRows(rawResult)

        // we have to use forEach here because while .map allows for conditionals, if the condition is not met the item is set to undefined
        const customerNumbers: internal.CustomerNumber[] = []
        result.forEach(num => {
            if (transformed[num.id] != undefined)
                customerNumbers.push(internal.CustomerNumber.create({id: num.id, numbers: transformed[num.id]}))
        })
        return [customerNumbers, count]
    }

    /**
     * Returns an SQL string which queries one `CustomerNumber` by ID.
     *
     * It also contains the reseller_id to allow for permission checks.
     * The returned fields can be mapped 1:1 to `RawCustomerNumberRow`.
     * @param index
     * @private
     */
    private getBaseRawQueryOne(index: number): string {
        const base = 'select c.id, sub.id as subscriber_id, num.id as number_id, num.cc, num.ac, num.sn, alias.is_primary, alias.is_devid, contact.reseller_id from billing.contracts c inner join billing.contacts contact on contact.id = c.contact_id inner join billing.voip_subscribers sub on sub.contract_id = c.id inner join billing.voip_numbers num on sub.id = num.subscriber_id inner join provisioning.voip_dbaliases alias on concat(num.cc,num.ac,num.sn) = alias.username'
        return `${base} where c.id = ${index}`
    }

    /**
     * Returns an SQL string which queries all `CustomerNumbers` for provided IDs.
     *
     * The returned fields can be mapped 1:1 to `RawCustomerNumberRow`.
     * @param indices Indices of contracts
     * @private
     */
    private getBaseRawQueryMany(indices: number[]): string {
        const base = 'select c.id, sub.id as subscriber_id, num.id as number_id, num.cc, num.ac, num.sn, alias.is_primary, alias.is_devid from billing.contracts c inner join billing.voip_subscribers sub on sub.contract_id = c.id inner join billing.voip_numbers num on sub.id = num.subscriber_id inner join provisioning.voip_dbaliases alias on concat(num.cc,num.ac,num.sn) = alias.username'
        return `${base} where c.id in (${indices.join(',')})`
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
            if (transformed[obj.id] == undefined) {
                transformed[obj.id] = []
            }
            transformed[obj.id].push(internal.SubscriberNumber.create({
                id: obj.subscriber_id,
                sn: obj.sn,
                ac: obj.ac,
                cc: obj.cc,
                isDevID: obj.is_devid == 1,
                isPrimary: obj.is_primary == 1,
                numberID: obj.number_id,
            }))
        })
        return transformed
    }

    private async createBaseQueryBuilder(sr: ServiceRequest): Promise<SelectQueryBuilder<db.billing.Contract>> {
        const qb = db.billing.Contract.createQueryBuilder('contract')
        qb.innerJoinAndSelect('contract.contact', 'contact')
        qb.innerJoinAndSelect('contract.voipSubscribers', 'billingSubscribers')
        qb.innerJoinAndSelect('billingSubscribers.voipNumbers', 'voipNumbers')

        await this.addPermissionFilterToQueryBuilder(qb, sr)
        return qb
    }

    private async createReadAllQueryBuilder(sr: ServiceRequest): Promise<SelectQueryBuilder<db.billing.Contract>> {
        const searchLogic = new SearchLogic(sr, Object.keys(new CustomernumberSearchDto()))
        const qb = await this.createBaseQueryBuilder(sr)
        await addOrderByToQueryBuilder(qb, sr.query, searchLogic)
        await this.addPaginationToQueryBuilder(qb, searchLogic)
        return qb
    }

    /**
     * Returns a new query string with appended WHERE filters.
     * If no filters are appended the `query` is returned un-modified.
     * @param query
     * @param params
     * @param searchLogic
     * @private
     */
    private appendSearchFilterToRawQuery(query: string, params: string[], searchLogic: SearchLogic): string {
        const searchFields = [
            {alias: 'alias', property: 'is_primary', searchParam: 'is_primary'},
            {alias: 'alias', property: 'is_devid', searchParam: 'is_devid'},
            {alias: 'sub', property: 'id', searchParam: 'subscriber_id'},
            {alias: 'num', property: 'id', searchParam: 'number_id'},
            {alias: 'num', property: 'cc', searchParam: 'cc'},
            {alias: 'num', property: 'ac', searchParam: 'ac'},
            {alias: 'num', property: 'sn', searchParam: 'sn'},
        ]
        const search: string[] = []
        searchFields.map(field => {
            if (params[field.searchParam] != null) {
                let value: string = params[field.searchParam]

                const whereComparator = value.includes('*') ? 'like' : '='
                value = value.replace(/\*/g, '%')

                search.push(`${field.alias}.${field.property} ${whereComparator} ${value}`)
            }
        })
        if (search.length == 0)
            return query
        return `${query} and (${search.join(searchLogic.searchOr ? ' or ' : ' and ')})`
    }

    // TODO: use this for search filters once Entity mapping for dbAliases works correctly
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