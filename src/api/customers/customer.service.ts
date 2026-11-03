import {Inject, Injectable, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {GenerateErrorMessageArray} from 'helpers/http-error.helper'
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
import {CrudService} from '~/interfaces/crud-service.interface'
import {ErrorMessage} from '~/interfaces/error-message.interface'
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
        const diff = contactIds.filter(id => !activeContacts.find(c => c.id === id))
        if (activeContacts.length !== contactIds.length) {
            const error: ErrorMessage = this.i18n.t('errors.INVALID_CONTACT_ID')
            throw new UnprocessableEntityException(GenerateErrorMessageArray(diff, error.message))
        }

        const now = new Date()
        await Promise.all(entities.map(async customer => {
            customer.productId = await this.readProductId(customer, sr)
            customer.createBillingMappings = await this.prepareCreateBillingMappings(customer, sr, now)
            customer.createTimestamp = now
            customer.modifyTimestamp = now
            await this.assignDefaultEmailTemplates(customer)
        }))
        const createdIds = await this.customerRepository.create(entities, sr)
        const createdCustomersDictionary = new Dictionary<internal.Customer>()
        createdIds.forEach((id, index) => {
            const customer = entities[index]
            createdCustomersDictionary[id] = {...customer, id, createBillingMappings: customer.createBillingMappings}
        })
        const createdCustomers = await this.customerRepository.readWhereInIds(createdIds, sr, undefined)
        if (createdCustomers.length !== createdIds.length) {
            const error: ErrorMessage = this.i18n.t('errors.CUSTOMER_CREATION_FAILED')
            throw new UnprocessableEntityException(error)
        }
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
        return await this.customerRepository.readActualBillingProfile(contractId, at)
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

    async update(updates: Dictionary<internal.Customer>, sr: ServiceRequest): Promise<number[]> {
        const contactIds = [...new Set(Object.values(updates).map(e => e.contactId))]
        const activeContacts = await this.contactRepository.readActiveContactsInIds(contactIds, {
            type: ContactType.CustomerContact,
            filterBy: sr.user.reseller_id_required ? {resellerId: sr.user.reseller_id} : undefined,
        })
        const diff = contactIds.filter(id => !activeContacts.find(c => c.id === id))
        if (activeContacts.length !== contactIds.length) {
            const error: ErrorMessage = this.i18n.t('errors.INVALID_CONTACT_ID')
            throw new UnprocessableEntityException(GenerateErrorMessageArray(diff, error.message))
        }

        const productPromises = Object.keys(updates).map(async id => {
            const customer = updates[id]
            customer.productId = await this.readProductId(customer, sr)
        })
        await Promise.all(productPromises)

        const now = new Date()
        const appendActions: {id: number, mappings: internal.BillingMapping[], deleteMappings: boolean}[] = []
        const mappingPromises = Object.keys(updates).map(async id => {
            const customerId = +id
            const oldEntity = await this.read(customerId, sr)
            const resource = updates[id]
            const contact = activeContacts.find(c => c.id === resource.contactId)
            const profileDef = resource.billingProfileDefinition || ContractBillingProfileDefinition.ID
            let mappingsToCreate: internal.BillingMapping[] = []
            // as v1: only the profiles mode replaces future mappings
            let deleteMappings = false
            if (profileDef === ContractBillingProfileDefinition.ID) {
                if (resource.billingProfileId !== undefined && resource.billingProfileId !== oldEntity.billingProfileId) {
                    mappingsToCreate = await this.updateBillingMappingsFromProfile(resource, contact, sr, now)
                }
                delete resource.profilePackageId
            } else if (profileDef === ContractBillingProfileDefinition.Profiles) {
                if (!Array.isArray(resource.billingProfiles)) {
                    throw new UnprocessableEntityException('Invalid field \'billingProfiles\'. Must be an array.')
                }
                mappingsToCreate = await this.updateBillingMappingsFromProfiles(resource, contact, sr, now)
                deleteMappings = true
                delete resource.profilePackageId
            } else if (profileDef === ContractBillingProfileDefinition.Package) {
                if (!contact.reseller_id) {
                    throw new UnprocessableEntityException()
                }
                // clearing the package keeps the mappings
                if (resource.profilePackageId != null && oldEntity.profilePackageId !== resource.profilePackageId) {
                    mappingsToCreate = await this.updateBillingMappingsFromPackage(resource, contact, sr, now)
                }
            } else {
                throw new UnprocessableEntityException()
            }
            delete resource.billingProfileId
            delete resource.billingProfiles
            delete resource.billingProfileDefinition
            resource.modifyTimestamp = now
            appendActions.push({id: customerId, mappings: mappingsToCreate, deleteMappings})
        })
        await Promise.all(mappingPromises)

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

    private async readProductId(customer: internal.Customer, sr: ServiceRequest): Promise<number> {
        const product = await this.customerRepository.readProductByType(customer.type, sr)
        if (product == undefined) {
            throw new UnprocessableEntityException(this.i18n.t('errors.TYPE_INVALID'))
        }
        return product.id
    }

    private async getContactFromCustomer(customer: internal.Customer, sr: ServiceRequest): Promise<internal.Contact> {
        let contact: internal.Contact
        try {
            const options: ContactOptions = {type: ContactType.CustomerContact}
            if (sr.user.reseller_id_required)
                options.filterBy = {resellerId: sr.user.reseller_id}
            contact = await this.contactRepository.readById(customer.contactId, options)
        } catch {
            throw new UnprocessableEntityException(this.i18n.t('errors.CONTACT_ID_INVALID'))
        }
        if (contact.status === ContactStatus.Terminated) {
            throw new UnprocessableEntityException('contact is terminated')
        }
        return contact
    }

    private async prepareCreateBillingMappings(customer: internal.Customer, sr: ServiceRequest, now?: Date): Promise<internal.BillingMapping[]> {
        const contact = await this.getContactFromCustomer(customer, sr)
        let mappings: internal.BillingMapping[] = []
        if (customer.billingProfileDefinition === ContractBillingProfileDefinition.ID) {
            mappings = await this.createBillingMappingsFromProfile(customer, contact, sr)
        } else if (customer.billingProfileDefinition === ContractBillingProfileDefinition.Package) {
            mappings = await this.createBillingMappingsFromPackage(customer, contact, sr, now)
        } else if (customer.billingProfileDefinition === ContractBillingProfileDefinition.Profiles) {
            mappings = await this.createBillingMappingsFromProfiles(customer, contact, sr, now)
        }
        customer.billingProfileId = undefined
        customer.billingProfiles = undefined
        customer.billingProfileDefinition = undefined

        return mappings
    }

    private async createBillingMappingsFromProfiles(customer: internal.Customer, contact: internal.Contact, sr: ServiceRequest, now: Date): Promise<internal.BillingMapping[]> {
        return this.billingMappingsFromProfiles(customer, contact, sr, now, false)
    }

    private async createBillingMappingsFromPackage(customer: internal.Customer, contact: internal.Contact, sr: ServiceRequest, _now?: Date): Promise<internal.BillingMapping[]> {
        if (!contact.reseller_id) {
            const error:ErrorMessage = this.i18n.t('errors.SETTING_PROFILE_PACKAGE_FOR_CUSTOMER_CONTRACTS_ONLY')
            throw new UnprocessableEntityException(error)
        }

        const pkg = await this.customerRepository.readProfilePackageWithInitialProfiles(customer.profilePackageId, sr)

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

    private async createBillingMappingsFromProfile(customer: internal.Customer, contact: internal.Contact, sr: ServiceRequest): Promise<internal.BillingMapping[]> {
        const [billingProfile] = await this.checkProfileNetwork(customer.billingProfileId, undefined, contact, sr)
        return [
            internal.BillingMapping.create({
                billingProfileId: billingProfile.id,
                networkId: undefined,
                startDate: undefined,
                endDate: undefined,
            }),
        ]
    }

    private async updateBillingMappingsFromProfile(customer: internal.Customer, contact: internal.Contact, sr: ServiceRequest, now: Date): Promise<internal.BillingMapping[]> {
        const [billingProfile] = await this.checkProfileNetwork(customer.billingProfileId, undefined, contact, sr)
        return [
            internal.BillingMapping.create({
                billingProfileId: billingProfile.id,
                networkId: undefined,
                startDate: now,
                endDate: undefined,
            }),
        ]
    }

    private async updateBillingMappingsFromPackage(customer: internal.Customer, contact: internal.Contact, sr: ServiceRequest, now: Date): Promise<internal.BillingMapping[]> {
        if (!contact.reseller_id) {
            const error: ErrorMessage = this.i18n.t('errors.SETTING_PROFILE_PACKAGE_FOR_CUSTOMER_CONTRACTS_ONLY')
            throw new UnprocessableEntityException(error)
        }
        const pkg = await this.customerRepository.readProfilePackageWithInitialProfiles(customer.profilePackageId, sr)
        if (pkg.resellerId != contact.reseller_id) {
            const error: ErrorMessage = this.i18n.t('errors.CONTACT_AND_BILLING_PROFILE_PACKAGE_RESELLER_ID_MISMATCH')
            throw new UnprocessableEntityException(error)
        }
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

    private async updateBillingMappingsFromProfiles(customer: internal.Customer, contact: internal.Contact, sr: ServiceRequest, now: Date): Promise<internal.BillingMapping[]> {
        return this.billingMappingsFromProfiles(customer, contact, sr, now, true)
    }

    private async billingMappingsFromProfiles(customer: internal.Customer, contact: internal.Contact, sr: ServiceRequest, now: Date, isUpdate: boolean): Promise<internal.BillingMapping[]> {
        const mappings: internal.BillingMapping[] = []
        let openIntervals = 0
        let openIntervalsAnyNetwork = 0
        for (const profile of customer.billingProfiles ?? []) {
            const [billingProfile, network] = await this.checkProfileNetwork(profile.id, profile.networkId, contact, sr)
            const start = profile.startDate || undefined
            const end = profile.endDate || undefined

            if (!start && !end) {
                openIntervals += 1
                if (!network)
                    openIntervalsAnyNetwork += 1
            } else if (!start && end) {
                throw new UnprocessableEntityException(this.i18n.t('errors.NO_START_DATE_WITH_PROVIDED_END_DATE'))
            } else {
                if (start <= now) {
                    throw new UnprocessableEntityException(this.i18n.t('errors.START_DATE_NOT_IN_FUTURE'))
                }
                if (end && start >= end) {
                    throw new UnprocessableEntityException(this.i18n.t('errors.START_AFTER_END_DATE'))
                }
            }

            mappings.push(internal.BillingMapping.create({
                billingProfileId: billingProfile.id,
                networkId: network ? network.id : null,
                startDate: start,
                endDate: end,
            }))
        }

        if (!isUpdate && openIntervalsAnyNetwork < 1) {
            throw new UnprocessableEntityException(this.i18n.t('errors.INITIAL_OPEN_INTERVAL_REQUIRED'))
        }
        if (isUpdate && openIntervals > 0) {
            throw new UnprocessableEntityException(this.i18n.t('errors.OPEN_INTERVAL_MAPPING_NOT_ALLOWED'))
        }
        return mappings
    }

    private async checkProfileNetwork(profileId: number, networkId: number | undefined, contact: internal.Contact, sr: ServiceRequest): Promise<[internal.BillingProfile, internal.BillingNetwork | undefined]> {
        const profile = await this.customerRepository.readBillingProfile(profileId, sr)
        if (!profile) {
            throw new UnprocessableEntityException(this.i18n.t('errors.INVALID_BILLING_PROFILE_ID'))
        }
        if (profile.status === BillingProfileStatus.Terminated) {
            throw new UnprocessableEntityException(this.i18n.t('errors.BILLING_PROFILE_ALREADY_TERMINATED'))
        }
        if (contact.reseller_id != undefined && profile.resellerId != undefined && contact.reseller_id != profile.resellerId) {
            throw new UnprocessableEntityException(this.i18n.t('errors.CONTACT_AND_BILLING_PROFILE_RESELLER_ID_MISMATCH'))
        }
        if (networkId == undefined) {
            return [profile, undefined]
        }
        const network = await this.customerRepository.readBillingNetwork(networkId, sr)
        if (!network) {
            throw new UnprocessableEntityException(this.i18n.t('errors.INVALID_BILLING_NETWORK_ID'))
        }
        if (contact.reseller_id != undefined && network.resellerId != undefined && contact.reseller_id != network.resellerId) {
            throw new UnprocessableEntityException(this.i18n.t('errors.CONTACT_AND_BILLING_NETWORK_RESELLER_ID_MISMATCH'))
        }
        return [profile, network]
    }

    private async checkPermissions(resellerId: number, sr: ServiceRequest): Promise<void> {
        if (sr.user.resellerId && sr.user.reseller_id != resellerId) {
            throw new NotFoundException()
        }
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

        Object.keys(resellerTemplates).forEach(async templateName => {
            const resellerTemplate = resellerTemplates.find(resellerTemplate => resellerTemplate.name === templateName)
            if (resellerTemplate) {
                customer[templateNames[templateName]] = resellerTemplate.id
            } else {
                const defaultTemplate = this.defaultEmailTemplates.find(defaultTemplate => defaultTemplate.name === templateName)
                await this.customerRepository.createResellerDefaultTemplate(contact.reseller_id, defaultTemplate)
            }
        })

    }
}
