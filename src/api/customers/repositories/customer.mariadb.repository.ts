import {Inject, Injectable, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'
import {EntityManager, SelectQueryBuilder} from 'typeorm'

import {CustomerSearchDto} from '~/api/customers/dto/customer-search.dto'
import {CustomerRepository} from '~/api/customers/interfaces/customer.repository'
import {AppService} from '~/app.service'
import {db, internal} from '~/entities'
import {ContractBillingProfileDefinition, ContractStatus} from '~/entities/internal/contract.internal.entity'
import {ProductClass} from '~/entities/internal/product.internal.entity'
import {Discriminator} from '~/entities/internal/profile-package-set.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {FilterBy} from '~/interfaces/filter-by.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

export interface CustomerFilterBy extends FilterBy {
    showTerminated?: boolean
}

@Injectable()
export class CustomerMariadbRepository extends MariaDbRepository implements CustomerRepository {
    private readonly log = new LoggerService(CustomerMariadbRepository.name)

    constructor(
        @Inject(AppService) private readonly app: AppService,
        @Inject(LoggerService) private readonly logger: LoggerService,
        @Inject(I18nService) private readonly i18n: I18nService,
    ) {
        super()
    }

    async create(customers: internal.Customer[], _sr: ServiceRequest, manager?: EntityManager): Promise<number[]> {
        const qb = manager ? manager.createQueryBuilder(db.billing.Contract, 'customers') : db.billing.Contract.createQueryBuilder('customers')
        const values = customers.map(customer => new db.billing.Contract().fromInternalCustomer(customer))
        const result = await qb.insert().values(values).execute()
        return result.identifiers.map((obj: {id: number}) => obj.id)
    }

    async appendBillingMappings(manager: EntityManager, customerId: number, mappings: internal.BillingMapping[], now?: Date, deleteMappings?: boolean): Promise<void> {
        let csvString = ''
        for (const mapping of mappings) {
            csvString += `${mapping.startDate ? mapping.startDate.toISOString() : ''},`
            csvString += `${mapping.endDate ? mapping.endDate.toISOString() : ''},`
            csvString += `${mapping.billingProfileId || ''},`
            csvString += `${mapping.networkId || ''},`
            csvString += ';'
        }
        this.log.debug({
            message: `create contract id ${customerId} billing mappings via proc: ${csvString}`,
            func: this.appendBillingMappings.name,
        })
        await manager.query('call billing.schedule_contract_billing_profile_network(?,?,?);', [
            customerId,
            (now && deleteMappings) ? now.toISOString() : undefined,
            csvString,
        ])
    }

    async createInitialBalance(manager: EntityManager, customerId: number): Promise<void> {
        // TODO: When billing is migrated this needs to be adjusted
        await manager.insert(db.billing.ContractBalance, {contract_id: customerId, cash_balance: 0})
    }

    async readCurrentBillingProfile(customerId: number): Promise<internal.BillingProfile> {
        const epoch = await this.readEffectiveStartDate(customerId)
        const qb = db.billing.ContractBillingProfileNetworkSchedule.createQueryBuilder('cbpns')
        qb.innerJoinAndSelect('cbpns.profileNetwork', 'profile_network')
        qb.innerJoinAndSelect('profile_network.billingProfile', 'billing_profile')
        qb.andWhere('profile_network.contract_id = :contract_id', {contract_id: customerId})
        qb.andWhere('profile_network.base = 1')
        qb.andWhere('cbpns.effective_start_time = :epoch', {epoch: epoch})
        const cbpns = await qb.getOneOrFail()
        return cbpns.profileNetwork.billingProfile.toInternal()
    }

    async readFutureBillingMappings(customerId: number): Promise<internal.BillingMapping[]> {
        const now = Date.now().valueOf()/1000
        const qb = db.billing.ContractBillingProfileNetworkSchedule.createQueryBuilder('cbpns')
        qb.innerJoinAndSelect('cbpns.profileNetwork', 'profile_network')
        qb.innerJoinAndSelect('profile_network.billingProfile', 'billing_profile')
        qb.andWhere('profile_network.contract_id = :contract_id', {contract_id: customerId})
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

    async readAllBillingMappings(customerId: number): Promise<internal.BillingMapping[]> {
        const qb = db.billing.ContractBillingProfileNetworkSchedule.createQueryBuilder('cbpns')
        qb.innerJoinAndSelect('cbpns.profileNetwork', 'profile_network')
        qb.innerJoinAndSelect('profile_network.billingProfile', 'billing_profile')
        qb.andWhere('profile_network.contract_id = :contract_id', {contract_id: customerId})
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

    async readEmailTemplateIdsByIds(ids: number[], resellerId: number): Promise<[number[], number]> {
        const qb = db.billing.EmailTemplate.createQueryBuilder('emailTemplate')
        qb.andWhere('emailTemplate.reseller_id = :resellerId', {resellerId: resellerId})
        qb.andWhereInIds(ids)

        const [templates, count] = await qb.getManyAndCount()
        const readIds = templates.map(template => template.id)
        return [readIds, count]
    }

    async readInvoiceTemplateById(id: number, resellerId: number): Promise<void> {
        const qb = db.billing.InvoiceTemplate.createQueryBuilder('invoiceTemplate')
        qb.andWhere('invoiceTemplate.reseller_id = :resellerId', {resellerId: resellerId})
        qb.andWhere('invoiceTemplate.id = :id', {id: id})
        await qb.getOneOrFail()
    }

    async readProductByType(manager: EntityManager, type: string, sr: ServiceRequest): Promise<internal.Product> {
        this.log.debug({
            message: 'read product by type',
            func: this.readProductByType.name,
            user: sr.user.username,
            type: type,
        })

        const product = await manager.findOne(db.billing.Product, {where: {class: <ProductClass>type}})
        return product != undefined ? product.toInternal() : undefined
    }

    async readProfilePackageById(id: number): Promise<internal.ProfilePackage> {
        const qb = db.billing.ProfilePackage.createQueryBuilder('profilePackage')
        qb.innerJoinAndSelect('profilePackage.packageProfileSets', 'packageProfileSets')
        qb.andWhereInIds(id)
        qb.andWhere('packageProfileSets.discriminator = :discriminator', {discriminator: Discriminator.Initial})
        const profilePackage = await qb.getOneOrFail()
        return profilePackage.toInternal()
    }

    async readBillingProfileById(id: number): Promise<internal.BillingProfile> {
        const profile = await db.billing.BillingProfile.findOneByOrFail({id: id})
        return profile.toInternal()
    }

    private async readEffectiveStartDate(contractId: number): Promise<number> {
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
        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(
            result.map(async (d) => {
                const internal = d.toInternalCustomer()
                const actualBillingProfileQb = db.billing.VActualBillingProfile.createQueryBuilder('actual_billing_profile')
                actualBillingProfileQb.where({contract_id: d.id})
                const actualBillingProfile = await actualBillingProfileQb.getOneOrFail()
                internal.billingProfileId = actualBillingProfile.billing_profile_id
                if (!internal.profilePackageId) {
                    const profileCountQb = db.billing.VContractBillingProfileNetworkSchedule.createQueryBuilder('profile_count')
                    profileCountQb.where({contract_id: d.id})
                    const profileCount = await profileCountQb.getCount()
                    if (profileCount === 1) {
                        internal.billingProfileDefinition = ContractBillingProfileDefinition.ID
                    } else {
                        internal.billingProfileDefinition = ContractBillingProfileDefinition.Profiles
                    }
                } else {
                    internal.billingProfileDefinition = ContractBillingProfileDefinition.Package
                }
                return internal
            }),
        ), totalCount]
    }

    async readById(id: number, sr: ServiceRequest, filterBy?: FilterBy): Promise<internal.Customer> {
        const qb = await this.createQueryBuilder(filterBy)
        qb.where({id: id})
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
        const result = await qb.getOneOrFail()
        const internal = result.toInternalCustomer()

        const actualBillingProfileQb = db.billing.VActualBillingProfile.createQueryBuilder('actual_billing_profile')
        actualBillingProfileQb.where({contract_id: result.id})
        const actualBillingProfile = await actualBillingProfileQb.getOneOrFail()
        internal.billingProfileId = actualBillingProfile.billing_profile_id
        if (!internal.profilePackageId) {
            const profileCountQb = db.billing.VContractBillingProfileNetworkSchedule.createQueryBuilder('profile_count')
            profileCountQb.where({contract_id: result.id})
            const profileCount = await profileCountQb.getCount()
            if (profileCount === 1) {
                internal.billingProfileDefinition = ContractBillingProfileDefinition.ID
            } else {
                internal.billingProfileDefinition = ContractBillingProfileDefinition.Profiles
            }
        } else {
            internal.billingProfileDefinition = ContractBillingProfileDefinition.Package
        }
        return internal
    }

    async readWhereInIds(ids: number[], sr: ServiceRequest, filterBy?: FilterBy, manager?: EntityManager): Promise<internal.Customer[]> {
        const qb = manager ? manager.createQueryBuilder(db.billing.Contract, 'customer') : db.billing.Contract.createQueryBuilder('customer')
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
        qb.whereInIds(ids)
        this.addFilterBy(qb, filterBy)
        const result = await qb.getMany()
        return await Promise.all(result.map(async (d) => {
            return d.toInternalCustomer()
        }))
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
        qb.whereInIds(ids)
        this.addFilterBy(qb, filterBy)
        return await qb.getCount()
    }

    async update(updates: Dictionary<internal.Customer>, _sr: ServiceRequest, manager?: EntityManager): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const dbEntity = db.billing.Contract.create()
            dbEntity.fromInternalCustomer(updates[id])
            if (manager) {
                await manager.getRepository(db.billing.Contract).update(id, dbEntity)
            } else {
                await db.billing.Contract.update(id, dbEntity)
            }
        }
        return ids
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        await db.billing.Contract.delete(ids)
        return ids
    }

    async readAllBillingProfiles(customerId: number, _sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.CustomerBillingProfile[], number]> {
        const customerQb = await this.createQueryBuilder(filterBy)
        customerQb.where({id: customerId})
        this.addFilterBy(customerQb, filterBy)
        await customerQb.getOneOrFail()

        const qb = db.billing.VContractBillingProfileNetworkSchedule.createQueryBuilder('billingProfiles')
        qb.where({contract_id: customerId})
        const [result, totalCount] = await qb.getManyAndCount()
        return [result.map((d) => d.toInternalCustomerBillingProfile()), totalCount]
    }

    async readBillingProfile(manager: EntityManager, profileId: number, _sr: ServiceRequest): Promise<internal.BillingProfile> {
        const profile = await manager.findOne(db.billing.BillingProfile, {where: {id: profileId}})
        if (!profile) {
            throw new NotFoundException()
        }
        return profile.toInternal()
    }

    async readBillingNetwork(manager: EntityManager, networkId: number, _sr: ServiceRequest): Promise<internal.BillingNetwork> {
        const network = await manager.findOne(db.billing.BillingNetwork, {where: {id: networkId}})
        if (!network) {
            return null
        }
        return network.toInternal()
    }

    async readProfilePackageWithInitialProfiles(manager: EntityManager, packageId: number, _sr: ServiceRequest): Promise<internal.ProfilePackage> {
        const qb = manager.createQueryBuilder(db.billing.ProfilePackage, 'profilePackage')
        qb.where({id: packageId})
        qb.innerJoinAndSelect('profilePackage.packageProfileSets', 'packageProfileSets')
        qb.andWhere('packageProfileSets.discriminator = :discriminator', {discriminator: Discriminator.Initial})
        const profile = await qb.getOne()
        if (!profile) {
            throw new NotFoundException(this.i18n.t('errors.INVALID_PROFILE_PACKAGE_ID'))
        }
        return profile.toInternal()
    }

    async readFutureBillingProfiles(customerId: number, _sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.CustomerBillingProfile[], number]> {
        const customerQb = await this.createQueryBuilder(filterBy)
        customerQb.where({id: customerId})
        this.addFilterBy(customerQb, filterBy)
        await customerQb.getOneOrFail()

        const qb = db.billing.VContractBillingProfileNetworkSchedule.createQueryBuilder('billingProfiles')
        qb.where({contract_id: customerId})
        qb.andWhere('start_date <= :now', {now: new Date()})
        const [result, totalCount] = await qb.getManyAndCount()
        return [result.map((d) => d.toInternalCustomerBillingProfile()), totalCount]
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
}
