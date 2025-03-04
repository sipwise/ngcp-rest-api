import {Injectable, MethodNotAllowedException, UnprocessableEntityException} from '@nestjs/common'
import {SelectQueryBuilder} from 'typeorm'

import {CustomerSearchDto} from '~/api/customers/dto/customer-search.dto'
import {CustomerFindOptions} from '~/api/customers/interfaces/customer-find-options.interface'
import {AppService} from '~/app.service'
import {db, internal} from '~/entities'
import {ProductClass} from '~/entities/internal/product.internal.entity'
import {Discriminator} from '~/entities/internal/profile-package-set.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

@Injectable()
export class CustomerMariadbRepository extends MariaDbRepository {
    private readonly log = new LoggerService(CustomerMariadbRepository.name)

    constructor(
        private readonly app: AppService,
    ) {
        super()
    }

    async _create(customers: internal.Customer[], now: Date, _sr: ServiceRequest): Promise<number[]> {
        const qb = db.billing.Contract.createQueryBuilder('contract')
        const ids: number[] = []
        for (const customer of customers) {
            const value = new db.billing.Contract().fromInternalCustomer(customer)
            const result = await qb.insert().values(value).execute()
            const id = result.identifiers[0]['id']
            ids.push(id)
            await this._appendBillingMappings(id, now, customer.allBillingMappings)
        }
        return ids
    }

    async _appendBillingMappings(customerId: number, now: Date, mappings: internal.BillingMapping[]): Promise<void> {
        const mappingsString = mappings.map(mapping => mapping.toCSVString()).join(';')
        const nowString = now.toISOString().slice(0, 19).replace('T', ' ')
        await this.app.db.query('call billing.schedule_contract_billing_profile_network(?,?,?);', [customerId, nowString, mappingsString])
        return
    }

    async _delete(_id: number, _sr: ServiceRequest): Promise<number> {
        throw new MethodNotAllowedException()
    }

    async _read(id: number, sr: ServiceRequest, options: CustomerFindOptions): Promise<internal.Customer> {
        this.log.debug({
            message: 'read customer by id',
            func: this._read.name,
            user: sr.user.username,
            id: id,
        })
        const qb = this._createBaseQueryBuilder(options)
        qb.andWhere('contract.id = :id', {id: id})
        const result = await qb.getOneOrFail()
        return result.toInternalCustomer()
    }

    async _readAll(sr: ServiceRequest, options: CustomerFindOptions): Promise<[internal.Customer[], number]> {
        this.log.debug({
            message: 'read all contracts',
            func: this._readAll.name,
            user: sr.user.username,
        })
        const qb = this._createBaseQueryBuilder(options)
        const contractSearchDtoKeys = Object.keys(new CustomerSearchDto())
        await configureQueryBuilder(qb, sr.query, new SearchLogic(sr, contractSearchDtoKeys))
        const [result, totalCount] = await qb.getManyAndCount()
        return [result.map(r => r.toInternalCustomer()), totalCount]
    }

    async _readWhereInIds(ids: number[], options: CustomerFindOptions): Promise<internal.Customer[]> {
        const qb = this._createBaseQueryBuilder(options)
        const customers = await qb.andWhereInIds(ids).getMany()
        return await Promise.all(customers.map(async (contract) => contract.toInternalCustomer()))
    }

    async _readCountOfIds(ids: number[], options: CustomerFindOptions): Promise<number> {
        const qb = this._createBaseQueryBuilder(options)
        return await qb.andWhereInIds(ids).getCount()
    }

    async _readProductByType(type: string, sr: ServiceRequest): Promise<internal.Product> {
        this.log.debug({
            message: 'read product by type',
            func: this._readProductByType.name,
            user: sr.user.username,
            type: type,
        })
        const product = await db.billing.Product.findOneBy({class: <ProductClass>type})
        return product != undefined ? product.toInternal() : undefined
    }

    async _update(updates: Dictionary<internal.Customer>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const update = new db.billing.Contract().fromInternalCustomer(updates[id])
            Object.keys(update).map(key => {
                if (update[key] == undefined)
                    delete update[key]
            })
            update.modify_timestamp = new Date(Date.now())
            await db.billing.Contract.update(id, update)
        }
        return ids
    }

    async _readBillingNetworkById(id: number): Promise<internal.BillingNetwork> {
        const network = await db.billing.BillingNetwork.findOneByOrFail({id: id})
        return network.toInternal()
    }

    async _readBillingProfileById(id: number): Promise<internal.BillingProfile> {
        const profile = await db.billing.BillingProfile.findOneByOrFail({id: id})
        return profile.toInternal()
    }

    async _readProfilePackageById(id: number): Promise<internal.ProfilePackage> {
        const qb = db.billing.ProfilePackage.createQueryBuilder('profilePackage')
        qb.innerJoinAndSelect('profilePackage.packageProfileSets', 'packageProfileSets')
        qb.andWhereInIds(id)
        qb.andWhere('packageProfileSets.discriminator = :discriminator', {discriminator: Discriminator.Initial})
        const profilePackage = await qb.getOneOrFail()
        return profilePackage.toInternal()
    }

    async _readEmailTemplateIdsByIds(ids: number[], resellerId: number): Promise<[number[], number]> {
        const qb = db.billing.EmailTemplate.createQueryBuilder('emailTemplate')
        qb.andWhere('emailTemplate.reseller_id = :resellerId', {resellerId: resellerId})
        qb.andWhereInIds(ids)

        const [templates, count] = await qb.getManyAndCount()
        const readIds = templates.map(template => template.id)
        return [readIds, count]
    }

    async _readInvoiceTemplateById(id: number, resellerId: number): Promise<void> {
        const qb = db.billing.InvoiceTemplate.createQueryBuilder('invoiceTemplate')
        qb.andWhere('invoiceTemplate.reseller_id = :resellerId', {resellerId: resellerId})
        qb.andWhere('invoiceTemplate.id = :id', {id: id})
        await qb.getOneOrFail()
    }

    async _readEffectiveStartDate(contractId: number): Promise<number> {
        const now = Date.now()
        const epochNow = now.valueOf()
        const qb = db.billing.ContractBillingProfileNetworkSchedule.createQueryBuilder('cbpns')
        qb.innerJoinAndSelect('cbpns.profileNetwork', 'profile_network')
        qb.andWhere('profile_network.contract_id = :contract_id', {contract_id: contractId})
        qb.andWhere('profile_network.base = 1')
        qb.andWhere('cbpns.effective_start_time <= :now', {now: epochNow})
        qb.select('MAX(cbpns.effective_start_time)', 'max')

        const result = await qb.getRawOne()
        if (result.max == undefined)
            throw new UnprocessableEntityException(`no billing profile for contract id ${contractId} at ${now} (${epochNow})`)
        return result['max'] as number
    }

    async _readCurrentBillingProfile(contractId: number): Promise<internal.BillingProfile> {
        const epoch = await this._readEffectiveStartDate(contractId)
        const qb = db.billing.ContractBillingProfileNetworkSchedule.createQueryBuilder('cbpns')
        qb.innerJoinAndSelect('cbpns.profileNetwork', 'profile_network')
        qb.innerJoinAndSelect('profile_network.billingProfile', 'billing_profile')
        qb.andWhere('profile_network.contract_id = :contract_id', {contract_id: contractId})
        qb.andWhere('profile_network.base = 1')
        qb.andWhere('cbpns.effective_start_time = :epoch', {epoch: epoch})
        const cbpns = await qb.getOneOrFail()
        return cbpns.profileNetwork.billingProfile.toInternal()
    }

    async _readFutureBillingMappings(contractId: number): Promise<internal.BillingMapping[]> {
        const now = Date.now().valueOf()/1000
        const qb = db.billing.ContractBillingProfileNetworkSchedule.createQueryBuilder('cbpns')
        qb.innerJoinAndSelect('cbpns.profileNetwork', 'profile_network')
        qb.innerJoinAndSelect('profile_network.billingProfile', 'billing_profile')
        qb.andWhere('profile_network.contract_id = :contract_id', {contract_id: contractId})
        qb.andWhere('profile_network.base = 1')
        qb.andWhere('cbpns.effective_start_time > :now', {now: now})
        qb.orderBy('cbpns.effective_start_time', 'DESC')
        const result = await qb.getMany()
        return result.map(cbpns => internal.BillingMapping.create({
            billingProfileId: cbpns.profileNetwork.billing_profile_id,
            effectiveStartTime: cbpns.effective_start_time,
            endDate: cbpns.profileNetwork.end_date,
            networkId: cbpns.profileNetwork.billing_network_id,
            startDate: cbpns.profileNetwork.start_date,
        }))
    }

    async _readAllBillingMappings(contractId: number): Promise<internal.BillingMapping[]> {
        const qb = db.billing.ContractBillingProfileNetworkSchedule.createQueryBuilder('cbpns')
        qb.innerJoinAndSelect('cbpns.profileNetwork', 'profile_network')
        qb.innerJoinAndSelect('profile_network.billingProfile', 'billing_profile')
        qb.andWhere('profile_network.contract_id = :contract_id', {contract_id: contractId})
        qb.andWhere('profile_network.base = 1')
        qb.andWhere('FLOOR(cbpns.effective_start_time) = cbpns.effective_start_time')
        qb.orderBy('cbpns.effective_start_time', 'ASC')
        const result = await qb.getMany()
        return result.map(cbpns => internal.BillingMapping.create({
            billingProfileId: cbpns.profileNetwork.billing_profile_id,
            effectiveStartTime: cbpns.effective_start_time,
            endDate: cbpns.profileNetwork.end_date,
            networkId: cbpns.profileNetwork.billing_network_id,
            startDate: cbpns.profileNetwork.start_date,
        }))
    }
    private _createBaseQueryBuilder(options: CustomerFindOptions): SelectQueryBuilder<db.billing.Contract> {
        const qb = db.billing.Contract.createQueryBuilder('contract')
        qb.leftJoinAndSelect('contract.product', 'product')
        qb.andWhere('contract.contact_id IS NOT NULL')
        qb.andWhere(`product.class IN ('${ProductClass.SipAccount}', '${ProductClass.PbxAccount}')`)
        if (options && options.filterBy) {
            qb.leftJoinAndSelect('contract.contact', 'contact')
            this._addPermissionFilterToQueryBuilder(qb, options)
        }
        return qb
    }

    private _addPermissionFilterToQueryBuilder(qb: SelectQueryBuilder<db.billing.Contract>, options: CustomerFindOptions): void {
        if (options.filterBy && options.filterBy.resellerId) {
            qb.andWhere('contact.reseller_id = :reseller_id', {reseller_id: options.filterBy.resellerId})
        }
    }
}
