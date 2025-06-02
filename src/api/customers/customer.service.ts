import {Inject, Injectable, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {GenerateErrorMessageArray} from 'helpers/http-error.helper'
import {I18nService} from 'nestjs-i18n'
import {EntityManager} from 'typeorm'

import {CustomerFilterBy,CustomerMariadbRepository} from './repositories/customer.mariadb.repository'

import {ContactOptions} from '~/api/contacts/interfaces/contact-options.interface'
import {ContactMariadbRepository} from '~/api/contacts/repositories/contact.mariadb.repository'
import {AppService} from '~/app.service'
import {internal} from '~/entities'
import {BillingProfileStatus} from '~/entities/internal/billing-profile.internal.entity'
import {ContactStatus, ContactType} from '~/entities/internal/contact.internal.entity'
import {ContractBillingProfileDefinition, ContractStatus} from '~/entities/internal/contract.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ErrorMessage} from '~/interfaces/error-message.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class CustomerService implements CrudService<internal.Customer> {
    private readonly log = new LoggerService(CustomerService.name)

    constructor(
        @Inject(CustomerMariadbRepository) private readonly customerRepository: CustomerMariadbRepository,
        @Inject(ContactMariadbRepository) private readonly contactRepository: ContactMariadbRepository,
        @Inject(AppService) private readonly app: AppService,
        @Inject(I18nService) private readonly i18n: I18nService,
    ) {
    }

    async create(entities: internal.Customer[], sr: ServiceRequest): Promise<internal.Customer[]> {
        const tx = await this.app.dbConnection().transaction(async manager => {
            const filters: CustomerFilterBy = {}
            if (sr.user.reseller_id_required)
                filters.resellerId = sr.user.reseller_id

            const contactIds = [...new Set(entities.map(e => e.contactId))]
            const activeContacts = await this.contactRepository.readActiveContactsInIds(manager, contactIds, {
                type: ContactType.CustomerContact,
                filterBy: filters,
            })
            const diff = contactIds.filter(id => !activeContacts.find(c => c.id === id))
            if (activeContacts.length !== contactIds.length) {
                const error: ErrorMessage = this.i18n.t('errors.INVALID_CONTACT_ID')
                throw new UnprocessableEntityException(GenerateErrorMessageArray(diff, error.message))
            }

            const now = new Date()
            await Promise.all(entities.map(async customer => {
                customer.productId = await this.readProductId(manager, customer, sr)
                customer.createBillingMappings = await this.prepareCreateBillingMappings(manager, customer, sr, now)
                customer.createTimestamp = now
                customer.modifyTimestamp = now
            }))
            const createdIds = await this.customerRepository.create(entities, sr, manager)
            const createdCustomersDictionary = new Dictionary<internal.Customer>()
            createdIds.forEach((id, index) => {
                const customer = entities[index]
                createdCustomersDictionary[id] = {...customer, id, createBillingMappings: customer.createBillingMappings}
            })
            const createdCustomers = await this.customerRepository.readWhereInIds(createdIds, sr, undefined, manager)
            if (createdCustomers.length !== createdIds.length) {
                const error: ErrorMessage = this.i18n.t('errors.CUSTOMER_CREATION_FAILED')
                throw new UnprocessableEntityException(error)
            }
            await Promise.all(createdCustomers.map(async customer => {
                const cust = createdCustomersDictionary[customer.id]
                await this.customerRepository.appendBillingMappings(manager, cust.id, cust.createBillingMappings)
                await this.customerRepository.createInitialBalance(manager, cust.id)
            }))
            return createdCustomers
        })
        return tx
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Customer[], number]> {
        const filters: CustomerFilterBy = {}
        if (sr.user.reseller_id_required)
            filters.resellerId = sr.user.reseller_id
        if (sr.query.include_terminated) {
            filters.showTerminated = true
            delete sr.query.include_terminated
        }

        return await this.customerRepository.readAll(sr, filters)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Customer> {
        const filters: CustomerFilterBy = {}
        if (sr.user.reseller_id_required)
            filters.resellerId = sr.user.reseller_id
        if (sr.query.include_terminated)
            filters.showTerminated = true
        return await this.customerRepository.readById(id, sr, filters)
    }

    async readAllBillingProfiles(customerId: number, sr: ServiceRequest): Promise<[internal.CustomerBillingProfile[], number]> {
        const CustomerFilterBy: CustomerFilterBy = {customerId}
        if (sr.user.reseller_id_required)
            CustomerFilterBy.resellerId = sr.user.reseller_id

        return await this.customerRepository.readAllBillingProfiles(customerId, sr, CustomerFilterBy)
    }

    async readFutureBillingProfiles(customerId: number, sr: ServiceRequest): Promise<[internal.CustomerBillingProfile[], number]> {
        const CustomerFilterBy: CustomerFilterBy = {customerId}
        if (sr.user.reseller_id_required)
            CustomerFilterBy.resellerId = sr.user.reseller_id

        return await this.customerRepository.readFutureBillingProfiles(customerId, sr, CustomerFilterBy)
    }

    async terminate(ids: number[], sr: ServiceRequest): Promise<number[]> {
        let customers: internal.Customer[]
        if (sr.user.reseller_id_required) {
            customers = await this.customerRepository.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id})
        } else {
            customers = await this.customerRepository.readWhereInIds(ids, sr)
        }

        if (customers.length == 0) {
            throw new NotFoundException()
        } else if (ids.length != customers.length) {
            const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }
        const updates = new Dictionary<internal.Customer>()
        for (const customer of customers) {
            updates[customer.id] = {
                ...customer,
                terminateTimestamp: new Date(),
                status: ContractStatus.Terminated,
            }
        }
        return await this.customerRepository.update(updates, sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        let sets: internal.Customer[]

        if (sr.user.reseller_id_required) {
            sets = await this.customerRepository.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id})
        } else {
            sets = await this.customerRepository.readWhereInIds(ids, sr)
        }

        if (sets.length == 0) {
            throw new NotFoundException()
        } else if (ids.length != sets.length) {
            const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        return await this.customerRepository.delete(ids, sr)
    }

    private async readProductId(manager: EntityManager, customer: internal.Customer, sr: ServiceRequest): Promise<number> {
        const product = await this.customerRepository.readProductByType(manager, customer.type, sr)
        if (product == undefined) {
            throw new UnprocessableEntityException(this.i18n.t('errors.TYPE_INVALID'))
        }
        return product.id
    }

    private async getContactFromCustomer(manager: EntityManager, customer: internal.Customer, sr: ServiceRequest): Promise<internal.Contact> {
        let contact: internal.Contact
        try {
            const options: ContactOptions = {type: ContactType.CustomerContact}
            if (sr.user.reseller_id_required)
                options.filterBy = {resellerId: sr.user.reseller_id}
            contact = await this.contactRepository.readById(customer.contactId, options, manager)
        } catch {
            throw new UnprocessableEntityException(this.i18n.t('errors.CONTACT_ID_INVALID'))
        }
        if (contact.status === ContactStatus.Terminated) {
            throw new UnprocessableEntityException('contact is terminated')
        }
        return contact
    }

    private async prepareCreateBillingMappings(manager: EntityManager, customer: internal.Customer, sr: ServiceRequest, now?: Date): Promise<internal.BillingMapping[]> {
        const contact = await this.getContactFromCustomer(manager, customer, sr)
        let mappings: internal.BillingMapping[] = []
        if (customer.billingProfileDefinition === ContractBillingProfileDefinition.ID) {
            mappings = await this.createBillingMappingsFromProfile(manager, customer, contact, sr)
        } else if (customer.billingProfileDefinition === ContractBillingProfileDefinition.Package) {
            mappings = await this.createBillingMappingsFromPackage(manager, customer, contact, sr, now)
        } else if (customer.billingProfileDefinition === ContractBillingProfileDefinition.Profiles) {
            mappings = await this.createBillingMappingsFromProfiles(manager, customer, contact, sr, now)
        }
        customer.billingProfileId = undefined
        customer.billingProfiles = undefined
        customer.billingProfileDefinition = undefined

        return mappings
    }

    private async createBillingMappingsFromProfiles(manager: EntityManager, customer: internal.Customer, contact: internal.Contact, sr: ServiceRequest, now?: Date): Promise<internal.BillingMapping[]> {
        const mappings: internal.BillingMapping[] = []
        const intervalCounts = {
            'open': 0,
            'open_any_network': 0,
            'open end': 0,
            'open start': 0,
            'start-end': 0,
        }
        for (const profile of customer.billingProfiles) {
            const billingProfile = await this.customerRepository.readBillingProfile(manager, profile.id, sr)
            const network = await this.customerRepository.readBillingNetwork(manager, profile.networkId, sr)
            if (contact.reseller_id != billingProfile.resellerId) {
                throw new NotFoundException()
            }
            if (network && contact.reseller_id != network.resellerId) {
                throw new NotFoundException()
            }

            const start = profile.startDate || undefined
            const end = profile.endDate || undefined

            if (!start && !end) {
                intervalCounts['open'] += 1
                intervalCounts['open_any_network'] += 1
            } else if (start && !end) {
                if (start <= now) {
                    throw new UnprocessableEntityException(this.i18n.t('errors.START_DATE_NOT_IN_FUTURE'))
                }
                intervalCounts['open end'] += 1
            } else if (!start && end) {
                throw new UnprocessableEntityException(this.i18n.t('errors.NO_START_DATE_WITH_PROVIDED_END_DATE'))
            } else {
                if (start <= now) {
                    throw new UnprocessableEntityException(this.i18n.t('errors.START_DATE_NOT_IN_FUTURE'))
                }
                if (start >= end) {
                    throw new UnprocessableEntityException(this.i18n.t('errors.START_AFTER_END_DATE'))
                }
                intervalCounts['start-end'] += 1
            }

            mappings.push(internal.BillingMapping.create({
                billingProfileId: billingProfile.id,
                networkId: (network) ? network.id : null,
                startDate: start,
                endDate: end,
            }))
        }

        return mappings
    }

    private async createBillingMappingsFromPackage(manager: EntityManager, customer: internal.Customer, contact: internal.Contact, sr: ServiceRequest, _now?: Date): Promise<internal.BillingMapping[]> {
        // If its not a customer contract
        if (!contact.reseller_id) {
            const error:ErrorMessage = this.i18n.t('errors.SETTING_PROFILE_PACKAGE_FOR_CUSTOMER_CONTRACTS_ONLY')
            throw new UnprocessableEntityException(error)
        }

        const pkg = await this.customerRepository.readProfilePackageWithInitialProfiles(manager, customer.profilePackageId, sr)

        if (pkg.resellerId != contact.reseller_id) {
            const error:ErrorMessage = this.i18n.t('errors.CONTACT_AND_BILLING_PROFILE_PACKAGE_RESELLER_ID_MISMATCH')
            throw new UnprocessableEntityException(error)
        }

        const mappings: internal.BillingMapping[] = []
        for (const profile of pkg.profilePackageSets) {
            const mapping = internal.BillingMapping.create({
                billingProfileId: profile.profile_id,
                networkId: profile.network_id,
                startDate: undefined,
                endDate: undefined,
            })
            mappings.push(mapping)
        }
        return mappings
    }

    private async createBillingMappingsFromProfile(manager: EntityManager, customer: internal.Customer, contact: internal.Contact, sr: ServiceRequest): Promise<internal.BillingMapping[]> {
        const billingProfile = await this.customerRepository.readBillingProfile(
            manager,
            customer.billingProfileId,
            sr,
        )
        if (billingProfile.status === BillingProfileStatus.Terminated) {
            const error:ErrorMessage = this.i18n.t('errors.BILLING_PROFILE_ALREADY_TERMINATED')
            throw new UnprocessableEntityException(error)
        }
        if (contact.reseller_id != billingProfile.resellerId) {
            const error:ErrorMessage = this.i18n.t('errors.CONTACT_AND_BILLING_PROFILE_RESELLER_ID_MISMATCH')
            throw new UnprocessableEntityException(error)
        }
        return [
            internal.BillingMapping.create({
                billingProfileId: billingProfile.id,
                networkId: undefined,
                startDate: undefined,
                endDate: undefined,
            }),
        ]
    }

    private async checkPermissions(resellerId: number, sr: ServiceRequest): Promise<void> {
        if (sr.user.resellerId && sr.user.reseller_id != resellerId) {
            throw new NotFoundException()
        }
    }
}
