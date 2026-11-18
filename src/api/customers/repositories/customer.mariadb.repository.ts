import {Inject, Injectable} from '@nestjs/common'
import {EntityNotFoundError, In, IsNull, SelectQueryBuilder} from 'typeorm'

import {CustomerSearchDto} from '~/api/customers/dto/customer-search.dto'
import {CustomerRepository} from '~/api/customers/interfaces/customer.repository'
import {AppService} from '~/app.service'
import {db, internal} from '~/entities'
import {BillingProfileStatus} from '~/entities/internal/billing-profile.internal.entity'
import {ContractBillingProfileDefinition, ContractStatus} from '~/entities/internal/contract.internal.entity'
import {ProductClass} from '~/entities/internal/product.internal.entity'
import {Discriminator} from '~/entities/internal/profile-package-set.internal.entity'
import {actualBillingMappingEpoch, andWhereActualBillingMapping, billingMappingsCsv} from '~/helpers/billing-mapping.helper'
import {balanceIntervalSettings, billingTimezone, initialBalanceInterval} from '~/helpers/billing.helper'
import {toLocalDateTime} from '~/helpers/date.helper'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder, sqlFieldSource} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {isOwnerTimezone, joinContractTimezone, storedTimezone} from '~/helpers/timezone.helper'
import {forEachYield, mapYield} from '~/helpers/yield.helper'
import {FilterBy} from '~/interfaces/filter-by.interface'
import {LazyFieldSources} from '~/interfaces/lazy-field-source.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

export interface CustomerFilterBy extends FilterBy {
    showTerminated?: boolean
}

function toInternalCustomer(contract: db.billing.Contract, sr: ServiceRequest): internal.Customer {
    const customer = contract.toInternalCustomer()
    if (isOwnerTimezone(sr))
        customer.ownerTimezone = storedTimezone(contract.ownerTimezone?.name)
    return customer
}

@Injectable()
export class CustomerMariadbRepository extends MariaDbRepository implements CustomerRepository {
    private readonly log = new LoggerService(CustomerMariadbRepository.name)
    readonly lazyFields: LazyFieldSources = {
        billing_profiles: sqlFieldSource({
            property: 'billingProfiles',
            rows: ids => this.billingProfilesQueryBuilder(ids),
            itemId: 'billingProfiles.contract_id',
            toInternal: rows => rows.map(row => row.toInternalCustomerBillingProfile()),
        }),
        future_billing_profiles: sqlFieldSource({
            property: 'futureBillingProfiles',
            rows: ids => this.billingProfilesQueryBuilder(ids, new Date()),
            itemId: 'billingProfiles.contract_id',
            toInternal: rows => rows.map(row => row.toInternalCustomerBillingProfile()),
        }),
    }

    constructor(
        @Inject(AppService) private readonly app: AppService,
    ) {
        super()
    }

    async create(customers: internal.Customer[], _sr: ServiceRequest): Promise<number[]> {
        const qb = db.billing.Contract.createQueryBuilder('customers')
        const values = customers.map(customer => new db.billing.Contract().fromInternalCustomer(customer))
        const result = await qb.insert().values(values).execute()
        return result.identifiers.map((obj: {id: number}) => obj.id)
    }

    async appendBillingMappings(customerId: number, mappings: internal.BillingMapping[], now?: Date, deleteMappings?: boolean): Promise<void> {
        const csvString = billingMappingsCsv(mappings)
        this.log.debug({
            message: `create contract id ${customerId} billing mappings via proc: ${csvString}`,
            func: this.appendBillingMappings.name,
        })
        const db = this.app.dbConnection()
        await db.query('call billing.schedule_contract_billing_profile_network(?,?,?);', [
            customerId,
            (now && deleteMappings) ? toLocalDateTime(now) : undefined,
            csvString,
        ])
    }

    /**
     * Initial balances of new customers, from the billing profile active now and their profile package
     */
    async createInitialBalances(customers: internal.Customer[]): Promise<void> {
        const ids = customers.map(customer => customer.id)
        const contracts = await db.billing.Contract.findBy({id: In(ids)})
        const contractById = new Map(contracts.map(contract => [contract.id, contract]))
        const packageIds = contracts.map(contract => contract.profile_package_id).filter(id => id != undefined)
        const packages = packageIds.length ? await db.billing.ProfilePackage.findBy({id: In(packageIds)}) : []
        const packageById = new Map(packages.map(profilePackage => [profilePackage.id, profilePackage]))
        const timezones = await db.billing.VContractTimezone.findBy({contract_id: In(ids)})
        const timezoneById = new Map(timezones.map(timezone => [timezone.contract_id, timezone.name]))
        const profileById = await this.readActualBillingProfiles(contracts, new Date())
        const balances = await mapYield(customers, customer => {
            const profilePackage = packageById.get(contractById.get(customer.id).profile_package_id)
            const settings = balanceIntervalSettings(profileById.get(customer.id), profilePackage && {
                balanceIntervalStartMode: profilePackage.balance_interval_start_mode,
                balanceIntervalUnit: profilePackage.balance_interval_unit,
                balanceIntervalValue: profilePackage.balance_interval_value,
            })
            const zone = billingTimezone(settings.startMode, timezoneById.get(customer.id))
            const {start, end} = initialBalanceInterval(settings, customer.createTimestamp, zone)
            return db.billing.ContractBalance.create({
                contract_id: customer.id,
                cash_balance: 0,
                start: start,
                end: end,
            })
        })
        await db.billing.ContractBalance.insert(balances)
    }

    /**
     * `readActualBillingProfile` of several contracts, per contract id
     */
    private async readActualBillingProfiles(contracts: db.billing.Contract[], at: Date): Promise<Map<number, internal.BillingProfile>> {
        const epochs = new Map(contracts.map(contract => [contract.id, actualBillingMappingEpoch(contract, at)]))
        const qb = db.billing.ContractBillingProfileNetworkSchedule.createQueryBuilder('cbpns')
        qb.innerJoinAndSelect('cbpns.profileNetwork', 'profile_network')
        qb.innerJoinAndSelect('profile_network.billingProfile', 'billing_profile')
        qb.where('profile_network.contract_id IN (:...ids)', {ids: [...epochs.keys()]})
        qb.andWhere('profile_network.base = 1')
        qb.orderBy('cbpns.effective_start_time', 'DESC')
        const profiles = new Map<number, internal.BillingProfile>()
        await forEachYield(await qb.getMany(), schedule => {
            const contractId = schedule.profileNetwork.contract_id
            if (!profiles.has(contractId) && +schedule.effective_start_time <= epochs.get(contractId))
                profiles.set(contractId, schedule.profileNetwork.billingProfile.toInternal())
        })
        return profiles
    }

    async readActualBillingProfile(contractId: number, at: Date = new Date()): Promise<internal.BillingProfile> {
        const contract = await db.billing.Contract.findOneByOrFail({id: contractId})
        const qb = db.billing.ContractBillingProfileNetworkSchedule.createQueryBuilder('cbpns')
        qb.innerJoinAndSelect('cbpns.profileNetwork', 'profile_network')
        qb.innerJoinAndSelect('profile_network.billingProfile', 'billing_profile')
        andWhereActualBillingMapping(qb, contract, at)
        const cbpns = await qb.getOne()
        if (!cbpns)
            return undefined
        return cbpns.profileNetwork.billingProfile.toInternal()
    }

    async readEmailTemplateIdsByIds(ids: number[], resellerId: number): Promise<[number[], number]> {
        const qb = db.billing.EmailTemplate.createQueryBuilder('emailTemplate')
        qb.andWhere('emailTemplate.reseller_id = :resellerId', {resellerId: resellerId})
        qb.andWhereInIds(ids)

        const [templates, count] = await qb.getManyAndCount()
        const readIds = templates.map(template => template.id)
        return [readIds, count]
    }

    async readCountOfInvoiceTemplates(ids: number[], resellerId: number): Promise<number> {
        const qb = db.billing.InvoiceTemplate.createQueryBuilder('invoiceTemplate')
        qb.andWhere('invoiceTemplate.reseller_id = :resellerId', {resellerId: resellerId})
        qb.andWhereInIds(ids)
        return await qb.getCount()
    }

    async readProductByType(type: string, sr: ServiceRequest): Promise<internal.Product> {
        this.log.debug({
            message: 'read product by type',
            func: this.readProductByType.name,
            user: sr.user.username,
            type: type,
        })
        const product = await db.billing.Product.findOneBy({class: <ProductClass>type})
        return product != undefined ? product.toInternal() : undefined
    }

    async readAll(sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.Customer[], number]> {
        const qb = await this.createQueryBuilder(filterBy)
        const searchDto  = new CustomerSearchDto()
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
        if (isOwnerTimezone(sr))
            joinContractTimezone(qb, 'contract.id')
        const [result, totalCount] = await qb.getManyAndCount()
        const customers = await mapYield(result, contract => toInternalCustomer(contract, sr))
        await this.assignBillingProfileDetails(customers)
        return [customers, totalCount]
    }

    async readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.Customer> {
        const qb = await this.createQueryBuilder(filterBy)
        qb.andWhere({id: id})
        const searchDto  = new CustomerSearchDto()
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
        if (isOwnerTimezone(sr))
            joinContractTimezone(qb, 'contract.id')
        const customer = toInternalCustomer(await qb.getOneOrFail(), sr)
        await this.assignBillingProfileDetails([customer])
        return customer
    }

    /**
     * Customers of the ids as `readById` reads one, without search parameters; unknown ids are left out
     */
    async readByIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.Customer[]> {
        const qb = await this.createQueryBuilder(filterBy)
        qb.andWhereInIds(ids)
        if (isOwnerTimezone(sr))
            joinContractTimezone(qb, 'contract.id')
        const customers = await mapYield(await qb.getMany(), contract => toInternalCustomer(contract, sr))
        await this.assignBillingProfileDetails(customers)
        return customers
    }

    /**
     * Sets the actual billing profile and the profile definition of the customers; one without an actual
     * billing profile is not found
     */
    private async assignBillingProfileDetails(customers: internal.Customer[]): Promise<void> {
        if (!customers.length)
            return
        const ids = customers.map(customer => customer.id)
        const actualProfiles = await db.billing.VActualBillingProfile.createQueryBuilder('actual_billing_profile')
            .where('actual_billing_profile.contract_id IN (:...ids)', {ids})
            .getMany()
        const actualProfileIds = new Map<number, number>()
        for (const row of actualProfiles) {
            if (!actualProfileIds.has(row.contract_id))
                actualProfileIds.set(row.contract_id, row.billing_profile_id)
        }
        const profileCounts = await this.countBillingProfiles(
            customers.filter(customer => !customer.profilePackageId).map(customer => customer.id),
        )
        for (const customer of customers) {
            if (!actualProfileIds.has(customer.id))
                throw new EntityNotFoundError(db.billing.VActualBillingProfile, {contract_id: customer.id})
            customer.billingProfileId = actualProfileIds.get(customer.id)
            if (customer.profilePackageId)
                customer.billingProfileDefinition = ContractBillingProfileDefinition.Package
            else if (profileCounts.get(customer.id) === 1)
                customer.billingProfileDefinition = ContractBillingProfileDefinition.ID
            else
                customer.billingProfileDefinition = ContractBillingProfileDefinition.Profiles
        }
    }

    /**
     * Number of billing profiles of each customer (`billingProfilesQueryBuilder`), per customer id
     */
    private async countBillingProfiles(customerIds: number[]): Promise<Map<number, number>> {
        if (!customerIds.length)
            return new Map()
        const qb = await this.billingProfilesQueryBuilder(customerIds)
        const rows = await qb.select('billingProfiles.contract_id', 'contract_id')
            .addSelect('COUNT(*)', 'count')
            .groupBy('billingProfiles.contract_id')
            .orderBy()
            .getRawMany<{contract_id: number, count: string}>()
        return new Map(rows.map(row => [row.contract_id, +row.count]))
    }

    async readBareById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.Customer> {
        const qb = await this.createQueryBuilder(filterBy)
        qb.andWhere({id: id})
        return toInternalCustomer(await qb.getOneOrFail(), sr)
    }

    async readWhereInIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.Customer[]> {
        const qb = db.billing.Contract.createQueryBuilder('customer')
        qb.andWhereInIds(ids)
        this.addFilterBy(qb, filterBy)
        if (isOwnerTimezone(sr))
            joinContractTimezone(qb, 'customer.id')
        const result = await qb.getMany()
        return result.map(d => toInternalCustomer(d, sr))
    }

    async readCountOfIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy): Promise<number> {
        const qb = db.billing.Contract.createQueryBuilder('customer')
        const searchDto = new CustomerSearchDto()
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
        qb.andWhereInIds(ids)
        this.addFilterBy(qb, filterBy)
        return await qb.getCount()
    }

    async update(updates: Dictionary<internal.Customer>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const dbEntity = db.billing.Contract.create()
            dbEntity.fromInternalCustomer(updates[id])
            await db.billing.Contract.update(id, dbEntity)
        }
        return ids
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        await db.billing.Contract.delete(ids)
        return ids
    }

    async readBillingProfile(profileId: number, _sr: ServiceRequest): Promise<internal.BillingProfile> {
        // a null id would be ignored in the where clause and return the first row
        if (profileId == undefined)
            return null
        const profile = await db.billing.BillingProfile.findOne({where: {id: profileId}})
        if (!profile) {
            return null
        }
        return profile.toInternal()
    }

    async readBillingNetwork(networkId: number, _sr: ServiceRequest): Promise<internal.BillingNetwork> {
        if (networkId == undefined)
            return null
        const network = await db.billing.BillingNetwork.findOne({where: {id: networkId}})
        if (!network) {
            return null
        }
        return network.toInternal()
    }

    async readProfilePackageWithInitialProfiles(packageId: number, _sr: ServiceRequest): Promise<internal.ProfilePackage> {
        const qb = db.billing.ProfilePackage.createQueryBuilder('profilePackage')
        qb.where({id: packageId})
        qb.innerJoinAndSelect('profilePackage.packageProfileSets', 'packageProfileSets')
        qb.andWhere('packageProfileSets.discriminator = :discriminator', {discriminator: Discriminator.Initial})
        const profile = await qb.getOne()
        return profile?.toInternal()
    }

    /**
     * Billing profile schedule of the customers, only the profiles starting after `startAfter` if given; no end
     * markers (+0.001), no terminated profiles/networks
     */
    private billingProfilesQueryBuilder(customerIds: number[], startAfter?: Date): Promise<SelectQueryBuilder<db.billing.VContractBillingProfileNetworkSchedule>> {
        const qb = db.billing.VContractBillingProfileNetworkSchedule.createQueryBuilder('billingProfiles')
        // no joins: the view has no primary column for getCount()
        qb.where('billingProfiles.contract_id IN (:...customerIds)', {customerIds})
        if (startAfter)
            qb.andWhere('billingProfiles.start_date > :startAfter', {startAfter})
        qb.andWhere('FLOOR(billingProfiles.effective_start_time) = billingProfiles.effective_start_time')
        qb.andWhere('billingProfiles.billing_profile_id NOT IN (SELECT id FROM billing.billing_profiles WHERE status = :terminated)',
            {terminated: BillingProfileStatus.Terminated})
        qb.andWhere('(billingProfiles.network_id IS NULL OR billingProfiles.network_id NOT IN ' +
            '(SELECT id FROM billing.billing_networks WHERE status = :terminated))')
        qb.orderBy('billingProfiles.effective_start_time', 'ASC')
        qb.addOrderBy('billingProfiles.id', 'ASC')
        return Promise.resolve(qb)
    }

    private createQueryBuilder(filters: CustomerFilterBy): Promise<SelectQueryBuilder<db.billing.Contract>> {
        const qb = db.billing.Contract.createQueryBuilder('contract')
        qb.leftJoinAndSelect('contract.product', 'product')
        qb.andWhere('contract.contact_id IS NOT NULL')
        qb.andWhere(`product.class IN ('${ProductClass.SipAccount}', '${ProductClass.PbxAccount}')`)
        this.addFilterBy(qb, filters)
        return Promise.resolve(qb)
    }

    private addFilterBy(qb: SelectQueryBuilder<db.billing.Contract>, filters: CustomerFilterBy): void {
        if (filters) {
            if (filters.resellerId) {
                qb.leftJoinAndSelect('contract.contact', 'contact')
                qb.andWhere('contact.reseller_id = :reseller_id', {reseller_id: filters.resellerId})
            }
            if (!filters.showTerminated) {
                qb.andWhere('contract.status != :status', {status: ContractStatus.Terminated})
            }
        }
    }

    async findDefaultEmailTemplates(): Promise<internal.EmailTemplate[]> {
        const templates = await db.billing.EmailTemplate.find(
            {
                where: {
                    reseller_id: IsNull(),
                },
            },
        )
        return templates.map(template => template.toInternal())
    }

    async findResellerEmailTemplates(resellerId: number): Promise<internal.EmailTemplate[]> {
        const templates = await db.billing.EmailTemplate.find(
            {
                where: {
                    reseller_id: resellerId,
                },
            },
        )
        return templates.map(template => template.toInternal())
    }

    async createResellerDefaultTemplate(resellerId: number, defaultTemplate: internal.EmailTemplate): Promise<number> {
        const template = await db.billing.EmailTemplate.findOneByOrFail({id: defaultTemplate.id})
        const copy = db.billing.EmailTemplate.create({...template, reseller_id: resellerId})
        delete copy.id
        const result = await db.billing.EmailTemplate.insert(copy)
        return (result.identifiers[0] as {id: number}).id
    }

    async readContactById(contactId: number): Promise<internal.Contact> {
        const contact = await db.billing.Contact.findOneOrFail({where: {id: contactId}})
        return contact.toInternal()
    }
}
