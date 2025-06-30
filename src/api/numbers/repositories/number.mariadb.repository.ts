import {Injectable} from '@nestjs/common'
import {BaseEntity, EntityNotFoundError, SelectQueryBuilder} from 'typeorm'

import {NumberSearchDto} from '~/api/numbers/dto/number-search.dto'
import {AppService} from '~/app.service'
import {db, internal} from '~/entities'
import {addOrderByToQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {QueriesDictionary, ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

interface RawNumberRow {
    id: number
    contract_id: number
    billingSubscriber_id: number
    voipNumber_id: number
    voipNumber_cc: number
    voipNumber_ac: string
    voipNumber_sn: string
    voipNumber_reseller_id: number
    is_primary: number
    is_devid: number
}

interface FilterBy {
    customerId?: number
    resellerId?: number
}

@Injectable()
export class NumberMariadbRepository extends MariaDbRepository {
    private readonly log = new LoggerService(NumberMariadbRepository.name)

    constructor(
        private readonly app: AppService,
    ) {
        super()
    }


    async readById(numberID: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.VoipNumber> {
        const qb = this.createBaseQueryBuilder(sr, filterBy)
        const searchDto = new NumberSearchDto()
        const searchLogic = new SearchLogic(
            sr,
            Object.keys(searchDto),
            undefined,
            searchDto._alias,
        )
        await this.addSearchFilterToQueryBuilder(qb, sr.query, searchLogic)
        qb.andWhere('voipNumber.id = :voipNumberID', {voipNumberID: numberID})
        const raw: RawNumberRow = await qb.getRawOne()
        if (raw == undefined)
            throw new EntityNotFoundError(db.billing.Contract, '')
        return internal.VoipNumber.create({
            subscriberID: raw.billingSubscriber_id,
            resellerID: raw.voipNumber_reseller_id,
            sn: raw.voipNumber_sn,
            ac: raw.voipNumber_ac,
            cc: raw.voipNumber_cc,
            isDevID: raw.is_devid == 1,
            isPrimary: raw.is_primary == 1,
            id: raw.voipNumber_id,
            contractID: raw.contract_id,
        })
    }


    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.VoipNumber[], number]> {
        const qb = this.createReadAllQueryBuilder(sr, filterBy)

        const resultRawEntity = await qb.getRawAndEntities()
        const result: RawNumberRow[] = resultRawEntity.raw
        const count = await qb.getCount()

        const numbers = this.transformRawNumberRows(result)

        return [numbers, count]
    }

    /**
     * Takes an array of `RawNumberRow` and returns a hash where the key is the contract ID and the value is an
     * array of subscribers belonging to that ID.
     * @param numbers
     * @private
     */
    private transformRawNumberRows(numbers: RawNumberRow[]): internal.VoipNumber[] {
        return numbers.map(raw => internal.VoipNumber.create({
            subscriberID: raw.billingSubscriber_id,
            resellerID: raw.voipNumber_reseller_id,
            sn: raw.voipNumber_sn,
            ac: raw.voipNumber_ac,
            cc: raw.voipNumber_cc,
            isDevID: raw.is_devid == 1,
            isPrimary: raw.is_primary == 1,
            id: raw.voipNumber_id,
            contractID: raw.contract_id,
        }))
    }

    private createBaseQueryBuilder(_sr: ServiceRequest, filterBy: FilterBy): SelectQueryBuilder<db.billing.VoipNumber> {
        const qb = db.billing.VoipNumber.createQueryBuilder('voipNumber')
        qb.innerJoinAndSelect('voipNumber.subscriber', 'billingSubscriber')
        qb.innerJoinAndSelect('billingSubscriber.contract', 'contract')
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

    private createReadAllQueryBuilder(sr: ServiceRequest, filterBy: FilterBy): SelectQueryBuilder<db.billing.VoipNumber> {
        const searchDto = new NumberSearchDto()
        const searchLogic = new SearchLogic(
            sr,
            Object.keys(searchDto),
            undefined,
            searchDto._alias,
        )
        const qb = this.createBaseQueryBuilder(sr, filterBy)
        this.addSearchFilterToQueryBuilder(qb, sr.query, searchLogic)
        addOrderByToQueryBuilder(qb, sr.query, searchLogic)
        this.addPaginationToQueryBuilder(qb, searchLogic)
        return qb
    }

    private addSearchFilterToQueryBuilder(qb: SelectQueryBuilder<db.billing.VoipNumber>, params: QueriesDictionary, searchLogic: SearchLogic): void {
        const searchFields = [
            {alias: 'billingSubscriber', property: 'subscriber_id', searchParam: 'subscriber_id'},
            {alias: 'contract', property: 'id', searchParam: 'customer_id'},
            {alias: 'dbAlias', property: 'is_primary', searchParam: 'is_primary'},
            {alias: 'dbAlias', property: 'is_devid', searchParam: 'is_devid'},
            {alias: 'voipNumber', property: 'reseller_id', searchParam: 'reseller_id'},
            {alias: 'voipNumber', property: 'cc', searchParam: 'cc'},
            {alias: 'voipNumber', property: 'ac', searchParam: 'ac'},
            {alias: 'voipNumber', property: 'sn', searchParam: 'sn'},
        ]
        searchFields.map(field => {
            if (params[field.searchParam] != null) {
                const parameter: string = params[field.searchParam].toString()
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

    private addPermissionFilterToQueryBuilder(qb: SelectQueryBuilder<db.billing.VoipNumber>, filterBy: FilterBy): void {
        if (filterBy) {
            if (filterBy.resellerId) {
                qb.andWhere('voipNumber.reseller_id = :reseller_id', {reseller_id: filterBy.resellerId})
            }
            if (filterBy.customerId) {
                qb.andWhere('contract.id = :customerId', {customerId: filterBy.customerId})
            }
        }
    }
}