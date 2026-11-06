import {Inject, Injectable, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {CustomerFilterBy,CustomerMariadbRepository} from './repositories/customer.mariadb.repository'

import {ContactOptions} from '~/api/contacts/interfaces/contact-options.interface'
import {ContactMariadbRepository} from '~/api/contacts/repositories/contact.mariadb.repository'
import {AppService} from '~/app.service'
import {internal} from '~/entities'
import {BillingProfileStatus} from '~/entities/internal/billing-profile.internal.entity'
import {ContactStatus, ContactType} from '~/entities/internal/contact.internal.entity'
import {ContractBillingProfileDefinition, ContractStatus} from '~/entities/internal/contract.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ApiErrors,apiError, checkItems, itemPointer, readFoundIds, throwMissingIds} from '~/helpers/errors.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class CustomerService implements CrudService<internal.Customer> {
    private readonly log = new LoggerService(CustomerService.name)
    private defaultEmailTemplates: internal.EmailTemplate[]

    constructor(
        @Inject(CustomerMariadbRepository) private readonly customerRepository: CustomerMariadbRepository,
        @Inject(ContactMariadbRepository) private readonly contactRepository: ContactMariadbRepository,
        @Inject(AppService) private readonly app: AppService,
        @Inject(I18nService) private readonly i18n: I18nService,
    ) {
    }

    async create(entities: internal.Customer[], sr: ServiceRequest): Promise<internal.Customer[]> {
        const filters: CustomerFilterBy = {}
        if (sr.user.reseller_id_required)
            filters.resellerId = sr.user.reseller_id

        const contactIds = [...new Set(entities.map(e => e.contactId))]
        const activeContacts = await this.contactRepository.readActiveContactsInIds(contactIds, {
            type: ContactType.CustomerContact,
            filterBy: filters,
        })
        this.checkActiveContacts(entities, activeContacts, sr)

        const now = new Date()
        await checkItems(entities, async (customer, key) => {
            await this.checkTemplates(customer, activeContacts.find(c => c.id === customer.contactId), sr, key)
            customer.productId = await this.readProductId(customer, sr, key)
            customer.createBillingMappings = await this.prepareCreateBillingMappings(customer, sr, key, now)
            customer.createTimestamp = now
            customer.modifyTimestamp = now
        })
        // sequentially, so customers of one reseller don't create its missing templates twice
        for (const customer of entities)
            await this.assignDefaultEmailTemplates(customer)
        const createdIds = await this.customerRepository.create(entities, sr)
        const createdCustomersDictionary = new Dictionary<internal.Customer>()
        createdIds.forEach((id, index) => {
            const customer = entities[index]
            createdCustomersDictionary[id] = {...customer, id, createBillingMappings: customer.createBillingMappings}
        })
        const createdCustomers = await this.customerRepository.readWhereInIds(createdIds, sr, undefined)
        if (createdCustomers.length !== createdIds.length)
            throw new UnprocessableEntityException(this.i18n.t('errors.CUSTOMER_CREATION_FAILED'))
        await Promise.all(createdCustomers.map(async customer => {
            const cust = createdCustomersDictionary[customer.id]
            await this.customerRepository.appendBillingMappings(cust.id, cust.createBillingMappings)
            await this.customerRepository.createInitialBalance(cust.id)
        }))
        return createdCustomers
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

    async readActualBillingProfile(contractId: number, at: Date): Promise<internal.BillingProfile> {
        const profile = await this.customerRepository.readActualBillingProfile(contractId, at)
        if (!profile)
            throw new UnprocessableEntityException(this.i18n.t('errors.CONTRACT_BILLING_PROFILE_NOT_FOUND', {args: {id: contractId}}))
        return profile
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

        throwMissingIds(sr, ids, customers.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))
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

        throwMissingIds(sr, ids, sets.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))

        return await this.customerRepository.delete(ids, sr)
    }

    async update(updates: Dictionary<internal.Customer>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => +id)
        throwMissingIds(sr, ids, await readFoundIds(ids, id => this.read(id, sr)), this.i18n.t('errors.ENTRY_NOT_FOUND'))
        const contactIds = [...new Set(Object.values(updates).map(e => e.contactId))]
        const activeContacts = await this.contactRepository.readActiveContactsInIds(contactIds, {
            type: ContactType.CustomerContact,
            filterBy: sr.user.reseller_id_required ? {resellerId: sr.user.reseller_id} : undefined,
        })
        this.checkActiveContacts(updates, activeContacts, sr)

        const now = new Date()
        const appendActions: {id: number, mappings: internal.BillingMapping[], deleteMappings: boolean}[] = []
        await checkItems(updates, async (resource, id) => {
            await this.checkTemplates(resource, activeContacts.find(c => c.id === resource.contactId), sr, id)
            resource.productId = await this.readProductId(resource, sr, id)
            const customerId = +id
            const oldEntity = await this.read(customerId, sr)
            const contact = activeContacts.find(c => c.id === resource.contactId)
            const profileDef = resource.billingProfileDefinition || ContractBillingProfileDefinition.ID
            let mappingsToCreate: internal.BillingMapping[] = []
            // as v1: only the profiles mode replaces future mappings
            let deleteMappings = false
            if (profileDef === ContractBillingProfileDefinition.ID) {
                if (resource.billingProfileId !== undefined && resource.billingProfileId !== oldEntity.billingProfileId) {
                    mappingsToCreate = await this.updateBillingMappingsFromProfile(resource, contact, sr, id, now)
                }
                delete resource.profilePackageId
            } else if (profileDef === ContractBillingProfileDefinition.Profiles) {
                if (!Array.isArray(resource.billingProfiles))
                    throw apiError(this.i18n.t('errors.BILLING_PROFILES_REQUIRED'), itemPointer(sr, id, resource, 'billingProfiles'))
                mappingsToCreate = await this.updateBillingMappingsFromProfiles(resource, contact, sr, id, now)
                deleteMappings = true
                delete resource.profilePackageId
            } else if (profileDef === ContractBillingProfileDefinition.Package) {
                if (!contact.reseller_id)
                    throw apiError(this.i18n.t('errors.SETTING_PROFILE_PACKAGE_FOR_CUSTOMER_CONTRACTS_ONLY'), itemPointer(sr, id, resource, 'profilePackageId'))
                // clearing the package keeps the mappings
                if (resource.profilePackageId != null && oldEntity.profilePackageId !== resource.profilePackageId) {
                    mappingsToCreate = await this.updateBillingMappingsFromPackage(resource, contact, sr, id, now)
                }
            } else {
                throw apiError(this.i18n.t('errors.BILLING_PROFILE_DEFINITION_INVALID'), itemPointer(sr, id, resource, 'billingProfileDefinition'))
            }
            delete resource.billingProfileId
            delete resource.billingProfiles
            delete resource.billingProfileDefinition
            resource.modifyTimestamp = now
            appendActions.push({id: customerId, mappings: mappingsToCreate, deleteMappings})
        })

        await this.customerRepository.update(updates, sr)

        const appendPromises = appendActions.map(action => {
            if (action.mappings.length > 0 || action.deleteMappings) {
                return this.customerRepository.appendBillingMappings(action.id, action.mappings, now, action.deleteMappings)
            }
            return Promise.resolve()
        })
        await Promise.all(appendPromises)

        return Object.keys(updates).map(id => +id)
    }

    /**
     * Reports every item whose contact is not an active customer contact visible to the user
     */
    private checkActiveContacts(customers: internal.Customer[] | Dictionary<internal.Customer>, activeContacts: internal.Contact[], sr: ServiceRequest): void {
        const errors = new ApiErrors()
        for (const [key, customer] of Object.entries(customers)) {
            if (!activeContacts.some(contact => contact.id === customer.contactId))
                errors.add(this.i18n.t('errors.INVALID_CONTACT_ID'), itemPointer(sr, key, customer, 'contactId'))
        }
        errors.throwIfAny()
    }

    private async readProductId(customer: internal.Customer, sr: ServiceRequest, key: number | string): Promise<number> {
        const product = await this.customerRepository.readProductByType(customer.type, sr)
        if (product == undefined)
            throw apiError(this.i18n.t('errors.TYPE_INVALID'), itemPointer(sr, key, customer, 'type'))
        return product.id
    }

    private async getContactFromCustomer(customer: internal.Customer, sr: ServiceRequest, key: number | string): Promise<internal.Contact> {
        let contact: internal.Contact
        try {
            const options: ContactOptions = {type: ContactType.CustomerContact}
            if (sr.user.reseller_id_required)
                options.filterBy = {resellerId: sr.user.reseller_id}
            contact = await this.contactRepository.readById(customer.contactId, options)
        } catch {
            throw apiError(this.i18n.t('errors.CONTACT_ID_INVALID'), itemPointer(sr, key, customer, 'contactId'))
        }
        if (contact.status === ContactStatus.Terminated)
            throw apiError(this.i18n.t('errors.CONTACT_TERMINATED'), itemPointer(sr, key, customer, 'contactId'))
        return contact
    }

    private async prepareCreateBillingMappings(customer: internal.Customer, sr: ServiceRequest, key: number | string, now?: Date): Promise<internal.BillingMapping[]> {
        const contact = await this.getContactFromCustomer(customer, sr, key)
        let mappings: internal.BillingMapping[] = []
        if (customer.billingProfileDefinition === ContractBillingProfileDefinition.ID) {
            mappings = await this.createBillingMappingsFromProfile(customer, contact, sr, key)
        } else if (customer.billingProfileDefinition === ContractBillingProfileDefinition.Package) {
            mappings = await this.createBillingMappingsFromPackage(customer, contact, sr, key)
        } else if (customer.billingProfileDefinition === ContractBillingProfileDefinition.Profiles) {
            mappings = await this.createBillingMappingsFromProfiles(customer, contact, sr, key, now)
        }
        customer.billingProfileId = undefined
        customer.billingProfiles = undefined
        customer.billingProfileDefinition = undefined

        return mappings
    }

    private async createBillingMappingsFromProfiles(customer: internal.Customer, contact: internal.Contact, sr: ServiceRequest, key: number | string, now: Date): Promise<internal.BillingMapping[]> {
        return this.billingMappingsFromProfiles(customer, contact, sr, key, now, false)
    }

    private async createBillingMappingsFromPackage(customer: internal.Customer, contact: internal.Contact, sr: ServiceRequest, key: number | string): Promise<internal.BillingMapping[]> {
        const pkg = await this.readProfilePackage(customer, contact, sr, key)

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

    private async createBillingMappingsFromProfile(customer: internal.Customer, contact: internal.Contact, sr: ServiceRequest, key: number | string): Promise<internal.BillingMapping[]> {
        const [billingProfile] = await this.checkProfileNetwork(customer.billingProfileId, undefined, contact, sr, itemPointer(sr, key, customer, 'billingProfileId'))
        return [
            internal.BillingMapping.create({
                billingProfileId: billingProfile.id,
                networkId: undefined,
                startDate: undefined,
                endDate: undefined,
            }),
        ]
    }

    private async updateBillingMappingsFromProfile(customer: internal.Customer, contact: internal.Contact, sr: ServiceRequest, key: number | string, now: Date): Promise<internal.BillingMapping[]> {
        const [billingProfile] = await this.checkProfileNetwork(customer.billingProfileId, undefined, contact, sr, itemPointer(sr, key, customer, 'billingProfileId'))
        return [
            internal.BillingMapping.create({
                billingProfileId: billingProfile.id,
                networkId: undefined,
                startDate: now,
                endDate: undefined,
            }),
        ]
    }

    private async updateBillingMappingsFromPackage(customer: internal.Customer, contact: internal.Contact, sr: ServiceRequest, key: number | string, now: Date): Promise<internal.BillingMapping[]> {
        const pkg = await this.readProfilePackage(customer, contact, sr, key)
        const mappings: internal.BillingMapping[] = []
        for (const profile of pkg.profilePackageSets) {
            mappings.push(internal.BillingMapping.create({
                billingProfileId: profile.profile_id,
                networkId: profile.network_id,
                startDate: now,
                endDate: undefined,
            }))
        }
        return mappings
    }

    private async updateBillingMappingsFromProfiles(customer: internal.Customer, contact: internal.Contact, sr: ServiceRequest, key: number | string, now: Date): Promise<internal.BillingMapping[]> {
        return this.billingMappingsFromProfiles(customer, contact, sr, key, now, true)
    }

    /**
     * Profile package of a customer with the initial profiles, it must belong to the contact's reseller
     */
    private async readProfilePackage(customer: internal.Customer, contact: internal.Contact, sr: ServiceRequest, key: number | string): Promise<internal.ProfilePackage> {
        const pointer = itemPointer(sr, key, customer, 'profilePackageId')
        if (!contact.reseller_id)
            throw apiError(this.i18n.t('errors.SETTING_PROFILE_PACKAGE_FOR_CUSTOMER_CONTRACTS_ONLY'), pointer)
        const pkg = await this.customerRepository.readProfilePackageWithInitialProfiles(customer.profilePackageId, sr)
        if (!pkg)
            throw apiError(this.i18n.t('errors.INVALID_PROFILE_PACKAGE_ID'), pointer)
        if (pkg.resellerId != contact.reseller_id)
            throw apiError(this.i18n.t('errors.CONTACT_AND_BILLING_PROFILE_PACKAGE_RESELLER_ID_MISMATCH'), pointer)
        return pkg
    }

    private async billingMappingsFromProfiles(customer: internal.Customer, contact: internal.Contact, sr: ServiceRequest, key: number | string, now: Date, isUpdate: boolean): Promise<internal.BillingMapping[]> {
        const mappings: internal.BillingMapping[] = []
        let firstOpenInterval: number
        let openIntervalsAnyNetwork = 0
        for (const [index, profile] of (customer.billingProfiles ?? []).entries()) {
            const at = (field: keyof internal.CustomerBillingProfile): string => itemPointer(sr, key, customer, 'billingProfiles', index, field)
            const [billingProfile, network] = await this.checkProfileNetwork(profile.id, profile.networkId, contact, sr, at('id'), at('networkId'))
            const start = profile.startDate || undefined
            const end = profile.endDate || undefined

            if (!start && !end) {
                firstOpenInterval ??= index
                if (!network)
                    openIntervalsAnyNetwork += 1
            } else if (!start && end) {
                throw apiError(this.i18n.t('errors.NO_START_DATE_WITH_PROVIDED_END_DATE'), at('startDate'))
            } else {
                if (start <= now)
                    throw apiError(this.i18n.t('errors.START_DATE_NOT_IN_FUTURE'), at('startDate'))
                if (end && start >= end)
                    throw apiError(this.i18n.t('errors.START_AFTER_END_DATE'), at('startDate'))
            }

            mappings.push(internal.BillingMapping.create({
                billingProfileId: billingProfile.id,
                networkId: network ? network.id : null,
                startDate: start,
                endDate: end,
            }))
        }

        if (!isUpdate && openIntervalsAnyNetwork < 1)
            throw apiError(this.i18n.t('errors.INITIAL_OPEN_INTERVAL_REQUIRED'), itemPointer(sr, key, customer, 'billingProfiles'))
        if (isUpdate && firstOpenInterval != undefined)
            throw apiError(this.i18n.t('errors.OPEN_INTERVAL_MAPPING_NOT_ALLOWED'), itemPointer(sr, key, customer, 'billingProfiles', firstOpenInterval))
        return mappings
    }

    /**
     * @param profilePointer pointer of the billing profile id in the request
     * @param networkPointer pointer of the network id in the request
     */
    private async checkProfileNetwork(profileId: number, networkId: number | undefined, contact: internal.Contact, sr: ServiceRequest, profilePointer: string, networkPointer?: string): Promise<[internal.BillingProfile, internal.BillingNetwork | undefined]> {
        const profile = await this.customerRepository.readBillingProfile(profileId, sr)
        if (!profile)
            throw apiError(this.i18n.t('errors.INVALID_BILLING_PROFILE_ID'), profilePointer)
        if (profile.status === BillingProfileStatus.Terminated)
            throw apiError(this.i18n.t('errors.BILLING_PROFILE_ALREADY_TERMINATED'), profilePointer)
        if (contact.reseller_id != undefined && profile.resellerId != undefined && contact.reseller_id != profile.resellerId)
            throw apiError(this.i18n.t('errors.CONTACT_AND_BILLING_PROFILE_RESELLER_ID_MISMATCH'), profilePointer)
        if (networkId == undefined)
            return [profile, undefined]
        const network = await this.customerRepository.readBillingNetwork(networkId, sr)
        if (!network)
            throw apiError(this.i18n.t('errors.INVALID_BILLING_NETWORK_ID'), networkPointer)
        if (contact.reseller_id != undefined && network.resellerId != undefined && contact.reseller_id != network.resellerId)
            throw apiError(this.i18n.t('errors.CONTACT_AND_BILLING_NETWORK_RESELLER_ID_MISMATCH'), networkPointer)
        return [profile, network]
    }

    private async checkPermissions(resellerId: number, sr: ServiceRequest): Promise<void> {
        if (sr.user.resellerId && sr.user.reseller_id != resellerId) {
            throw new NotFoundException()
        }
    }

    private async checkTemplates(customer: internal.Customer, contact: internal.Contact, sr: ServiceRequest, key: number | string): Promise<void> {
        const emailTemplateFields: (keyof internal.Customer)[] = ['subscriberEmailTemplateId', 'passresetEmailTemplateId', 'invoiceEmailTemplateId']
        const fields = emailTemplateFields.filter(field => customer[field] != undefined)
        if (fields.length) {
            const [readIds] = await this.customerRepository.readEmailTemplateIdsByIds(
                [...new Set(fields.map(field => +customer[field]))], contact.reseller_id,
            )
            const invalid = fields.find(field => !readIds.includes(+customer[field]))
            if (invalid)
                throw apiError(this.i18n.t('errors.EMAIL_TEMPLATE_NOT_FOUND'), itemPointer(sr, key, customer, invalid))
        }
        if (customer.invoiceTemplateId != undefined
            && !await this.customerRepository.readCountOfInvoiceTemplates([customer.invoiceTemplateId], contact.reseller_id))
            throw apiError(this.i18n.t('errors.INVOICE_TEMPLATE_NOT_FOUND', {args: {id: customer.invoiceTemplateId}}), itemPointer(sr, key, customer, 'invoiceTemplateId'))
    }

    private async assignDefaultEmailTemplates(customer: internal.Customer): Promise<void> {
        if (!this.defaultEmailTemplates)
            this.defaultEmailTemplates = await this.customerRepository.findDefaultEmailTemplates()

        const contact = await this.customerRepository.readContactById(customer.contactId)
        const resellerTemplates = await this.customerRepository.findResellerEmailTemplates(contact.reseller_id)

        const templateNames: {[key: string]: string} = {
            'subscriber_default_email': 'subscriberEmailTemplateId',
            'passreset_default_email': 'passresetEmailTemplateId',
            'invoice_default_email': 'invoiceEmailTemplateId',
        }

        for (const [templateName, field] of Object.entries(templateNames)) {
            if (customer[field] != undefined)
                continue
            const resellerTemplate = resellerTemplates.find(template => template.name === templateName)
            if (resellerTemplate) {
                customer[field] = resellerTemplate.id
                continue
            }
            const defaultTemplate = this.defaultEmailTemplates.find(template => template.name === templateName)
            if (defaultTemplate)
                customer[field] = await this.customerRepository.createResellerDefaultTemplate(contact.reseller_id, defaultTemplate)
        }
    }
}
