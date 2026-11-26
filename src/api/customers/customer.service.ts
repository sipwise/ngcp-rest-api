import {Inject, Injectable, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {CustomerFilterBy,CustomerMariadbRepository} from './repositories/customer.mariadb.repository'

import {ContactMariadbRepository} from '~/api/contacts/repositories/contact.mariadb.repository'
import {AppService} from '~/app.service'
import {internal} from '~/entities'
import {ContactType} from '~/entities/internal/contact.internal.entity'
import {ContractBillingProfileDefinition, ContractStatus} from '~/entities/internal/contract.internal.entity'
import {billingIntervalError, billingNetworkError, billingOpenIntervalError, billingProfileError} from '~/helpers/billing-mapping.helper'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ApiErrors,apiError, checkItems, itemPointer, throwMissingIds} from '~/helpers/errors.helper'
import {applyLazyFields, mergeLazyFields, readLazyField} from '~/helpers/lazy-field.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {forEachYield, mapYield} from '~/helpers/yield.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {LazyFieldSources} from '~/interfaces/lazy-field-source.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

// the contacts, products, templates and billing data the customers of a request refer to
interface CustomerReferences {
    contacts: Map<number, internal.Contact>
    products: Map<string, internal.Product>
    // per reseller id
    emailTemplates: Map<number, internal.EmailTemplate[]>
    invoiceTemplateResellerIds: Map<number, number>
    billingProfiles: Map<number, internal.BillingProfile>
    billingNetworks: Map<number, internal.BillingNetwork>
    profilePackages: Map<number, internal.ProfilePackage>
}

@Injectable()
export class CustomerService implements CrudService<internal.Customer> {
    private readonly log = new LoggerService(CustomerService.name)
    private defaultEmailTemplates: internal.EmailTemplate[]
    readonly lazyFields: LazyFieldSources

    constructor(
        @Inject(CustomerMariadbRepository) private readonly customerRepository: CustomerMariadbRepository,
        @Inject(ContactMariadbRepository) private readonly contactRepository: ContactMariadbRepository,
        @Inject(AppService) private readonly app: AppService,
        @Inject(I18nService) private readonly i18n: I18nService,
    ) {
        this.lazyFields = mergeLazyFields(customerRepository.lazyFields)
    }

    async create(entities: internal.Customer[], sr: ServiceRequest): Promise<internal.Customer[]> {
        const references = await this.readReferences(entities, sr)
        await this.checkActiveContacts(entities, references, sr)

        const now = new Date()
        await checkItems(entities, async (customer, key) => {
            const contact = references.contacts.get(customer.contactId)
            this.checkTemplates(customer, contact, references, sr, key)
            this.setProductId(customer, references, sr, key)
            customer.createBillingMappings = await this.prepareCreateBillingMappings(customer, contact, references, sr, key, now)
            customer.createTimestamp = now
            customer.modifyTimestamp = now
        })
        this.defaultEmailTemplates ??= await this.customerRepository.findDefaultEmailTemplates()
        // sequentially, so customers of one reseller don't create its missing templates twice
        await forEachYield(entities, customer => this.assignDefaultEmailTemplates(customer, references))
        const createdIds = await this.customerRepository.create(entities, sr)
        for (const [index, id] of createdIds.entries())
            entities[index].id = id
        for (const customer of entities)
            await this.customerRepository.appendBillingMappings(customer.id, customer.createBillingMappings)
        await this.customerRepository.createInitialBalances(entities)
        // read after the mappings, the representation shows the billing profile schedule
        const createdCustomers = await this.customerRepository.readWhereInIds(createdIds, sr, undefined)
        if (createdCustomers.length !== createdIds.length)
            throw new UnprocessableEntityException(this.i18n.t('errors.CUSTOMER_CREATION_FAILED'))
        await applyLazyFields(createdCustomers, this.lazyFields, sr)
        return createdCustomers
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Customer[], number]> {
        const [customers, totalCount] = await this.customerRepository.readAll(sr, this.readFilter(sr))
        await applyLazyFields(customers, this.lazyFields, sr)
        return [customers, totalCount]
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Customer> {
        const customer = await this.customerRepository.readById(id, sr, this.readFilter(sr))
        await applyLazyFields([customer], this.lazyFields, sr)
        return customer
    }

    /**
     * A page of a lazy field of the customer (`<item>/@<field>`)
     * @param toResponse response DTO of the customer for the caller, 404 when it hides the field
     */
    async readField(id: number, field: string, sr: ServiceRequest, toResponse: (customer: internal.Customer) => object): Promise<[unknown[], number]> {
        const customer = await this.customerRepository.readBareById(id, sr, this.readFilter(sr))
        return await readLazyField(customer, field, this.lazyFields, sr, toResponse)
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
        const oldCustomers = new Map((await this.customerRepository.readByIds(ids, sr, this.readFilter(sr))).map(customer => [customer.id, customer]))
        throwMissingIds(sr, ids, [...oldCustomers.keys()], this.i18n.t('errors.ENTRY_NOT_FOUND'))
        const references = await this.readReferences(Object.values(updates), sr)
        await this.checkActiveContacts(updates, references, sr)

        const now = new Date()
        const appendActions: {id: number, mappings: internal.BillingMapping[], deleteMappings: boolean}[] = []
        await checkItems(updates, async (resource, id) => {
            const contact = references.contacts.get(resource.contactId)
            this.checkTemplates(resource, contact, references, sr, id)
            this.setProductId(resource, references, sr, id)
            const customerId = +id
            const oldEntity = oldCustomers.get(customerId)
            const profileDef = resource.billingProfileDefinition || ContractBillingProfileDefinition.ID
            let mappingsToCreate: internal.BillingMapping[] = []
            // only the profiles mode replaces future mappings
            let deleteMappings = false
            if (profileDef === ContractBillingProfileDefinition.ID) {
                if (resource.billingProfileId !== undefined && resource.billingProfileId !== oldEntity.billingProfileId) {
                    mappingsToCreate = this.billingMappingsFromProfile(resource, contact, references, sr, id, now)
                }
                delete resource.profilePackageId
            } else if (profileDef === ContractBillingProfileDefinition.Profiles) {
                if (!Array.isArray(resource.billingProfiles))
                    throw apiError(this.i18n.t('errors.BILLING_PROFILES_REQUIRED'), itemPointer(sr, id, resource, 'billingProfiles'))
                mappingsToCreate = await this.billingMappingsFromProfiles(resource, contact, references, sr, id, now, true)
                deleteMappings = true
                delete resource.profilePackageId
            } else if (profileDef === ContractBillingProfileDefinition.Package) {
                if (!contact.reseller_id)
                    throw apiError(this.i18n.t('errors.SETTING_PROFILE_PACKAGE_FOR_CUSTOMER_CONTRACTS_ONLY'), itemPointer(sr, id, resource, 'profilePackageId'))
                // clearing the package keeps the mappings
                if (resource.profilePackageId != null && oldEntity.profilePackageId !== resource.profilePackageId) {
                    mappingsToCreate = this.billingMappingsFromPackage(resource, contact, references, sr, id, now)
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

        for (const action of appendActions) {
            if (action.mappings.length > 0 || action.deleteMappings)
                await this.customerRepository.appendBillingMappings(action.id, action.mappings, now, action.deleteMappings)
        }

        return Object.keys(updates).map(id => +id)
    }

    // include_terminated is no search field, so it is taken out of the query
    private readFilter(sr: ServiceRequest): CustomerFilterBy {
        const filters: CustomerFilterBy = {}
        if (sr.user.reseller_id_required)
            filters.resellerId = sr.user.reseller_id
        const showTerminated = SearchLogic.parseBoolean(sr, 'include_terminated')
        if (showTerminated !== undefined) {
            filters.showTerminated = showTerminated
            delete sr.query.include_terminated
        }
        return filters
    }

    private async readReferences(customers: internal.Customer[], sr: ServiceRequest): Promise<CustomerReferences> {
        const contactIds = [...new Set(customers.map(customer => customer.contactId))]
        const contacts = await this.contactRepository.readActiveContactsInIds(contactIds, {
            type: ContactType.CustomerContact,
            filterBy: sr.user.reseller_id_required ? {resellerId: sr.user.reseller_id} : undefined,
        })
        const resellerIds = [...new Set(contacts.map(contact => contact.reseller_id))]
        const types = [...new Set(customers.map(customer => customer.type))]
        const invoiceTemplateIds = [...new Set(customers.map(customer => customer.invoiceTemplateId))]
        const mappingProfiles = customers.flatMap(customer => customer.billingProfiles ?? [])
        const profileIds = [...new Set([
            ...customers.map(customer => customer.billingProfileId),
            ...mappingProfiles.map(profile => profile.id),
        ])]
        const networkIds = [...new Set(mappingProfiles.map(profile => profile.networkId))]
        const packageIds = [...new Set(customers.map(customer => customer.profilePackageId))]

        const emailTemplates = new Map<number, internal.EmailTemplate[]>(resellerIds.map(id => [id, []]))
        for (const template of await this.customerRepository.readEmailTemplatesOfResellers(resellerIds))
            emailTemplates.get(template.resellerId).push(template)
        const invoiceTemplateResellerIds = await this.customerRepository.readInvoiceTemplateResellerIds(invoiceTemplateIds)
        const products = await this.customerRepository.readProductsByTypes(types)
        const profiles = await this.customerRepository.readBillingProfiles(profileIds)
        const networks = await this.customerRepository.readBillingNetworks(networkIds)
        const packages = await this.customerRepository.readProfilePackagesWithInitialProfiles(packageIds)
        return {
            contacts: new Map(contacts.map(contact => [contact.id, contact])),
            products: new Map(products.map(product => [product.class as string, product])),
            emailTemplates,
            invoiceTemplateResellerIds,
            billingProfiles: new Map(profiles.map(profile => [profile.id, profile])),
            billingNetworks: new Map(networks.map(network => [network.id, network])),
            profilePackages: new Map(packages.map(profilePackage => [profilePackage.id, profilePackage])),
        }
    }

    /**
     * Reports every item whose contact is not an active customer contact visible to the user
     */
    private async checkActiveContacts(customers: internal.Customer[] | Dictionary<internal.Customer>, references: CustomerReferences, sr: ServiceRequest): Promise<void> {
        const errors = new ApiErrors()
        await forEachYield(Object.entries(customers), ([key, customer]) => {
            if (!references.contacts.has(customer.contactId))
                errors.add(this.i18n.t('errors.INVALID_CONTACT_ID'), itemPointer(sr, key, customer, 'contactId'))
        })
        errors.throwIfAny()
    }

    private setProductId(customer: internal.Customer, references: CustomerReferences, sr: ServiceRequest, key: number | string): void {
        const product = references.products.get(customer.type)
        if (product == undefined)
            throw apiError(this.i18n.t('errors.TYPE_INVALID'), itemPointer(sr, key, customer, 'type'))
        customer.productId = product.id
    }

    private async prepareCreateBillingMappings(customer: internal.Customer, contact: internal.Contact, references: CustomerReferences, sr: ServiceRequest, key: number | string, now: Date): Promise<internal.BillingMapping[]> {
        let mappings: internal.BillingMapping[] = []
        if (customer.billingProfileDefinition === ContractBillingProfileDefinition.ID) {
            mappings = this.billingMappingsFromProfile(customer, contact, references, sr, key)
        } else if (customer.billingProfileDefinition === ContractBillingProfileDefinition.Package) {
            mappings = this.billingMappingsFromPackage(customer, contact, references, sr, key)
        } else if (customer.billingProfileDefinition === ContractBillingProfileDefinition.Profiles) {
            mappings = await this.billingMappingsFromProfiles(customer, contact, references, sr, key, now, false)
        }
        customer.billingProfileId = undefined
        customer.billingProfiles = undefined
        customer.billingProfileDefinition = undefined

        return mappings
    }

    /**
     * @param startDate start of the mapping, open (from the contract creation) if not given
     */
    private billingMappingsFromProfile(customer: internal.Customer, contact: internal.Contact, references: CustomerReferences, sr: ServiceRequest, key: number | string, startDate?: Date): internal.BillingMapping[] {
        const [billingProfile] = this.checkProfileNetwork(customer.billingProfileId, undefined, contact, references, itemPointer(sr, key, customer, 'billingProfileId'))
        return [
            internal.BillingMapping.create({
                billingProfileId: billingProfile.id,
                networkId: undefined,
                startDate,
                endDate: undefined,
            }),
        ]
    }

    /**
     * @param startDate start of the mappings, open (from the contract creation) if not given
     */
    private billingMappingsFromPackage(customer: internal.Customer, contact: internal.Contact, references: CustomerReferences, sr: ServiceRequest, key: number | string, startDate?: Date): internal.BillingMapping[] {
        const pkg = this.checkProfilePackage(customer, contact, references, sr, key)
        const mappings: internal.BillingMapping[] = []
        for (const profile of pkg.profilePackageSets) {
            mappings.push(internal.BillingMapping.create({
                billingProfileId: profile.profile_id,
                networkId: profile.network_id,
                startDate,
                endDate: undefined,
            }))
        }
        return mappings
    }

    /**
     * Profile package of a customer with the initial profiles, it must belong to the contact's reseller
     */
    private checkProfilePackage(customer: internal.Customer, contact: internal.Contact, references: CustomerReferences, sr: ServiceRequest, key: number | string): internal.ProfilePackage {
        const pointer = itemPointer(sr, key, customer, 'profilePackageId')
        if (!contact.reseller_id)
            throw apiError(this.i18n.t('errors.SETTING_PROFILE_PACKAGE_FOR_CUSTOMER_CONTRACTS_ONLY'), pointer)
        const pkg = references.profilePackages.get(customer.profilePackageId)
        if (!pkg)
            throw apiError(this.i18n.t('errors.INVALID_PROFILE_PACKAGE_ID'), pointer)
        if (pkg.resellerId != contact.reseller_id)
            throw apiError(this.i18n.t('errors.CONTACT_AND_BILLING_PROFILE_PACKAGE_RESELLER_ID_MISMATCH'), pointer)
        return pkg
    }

    private async billingMappingsFromProfiles(customer: internal.Customer, contact: internal.Contact, references: CustomerReferences, sr: ServiceRequest, key: number | string, now: Date, isUpdate: boolean): Promise<internal.BillingMapping[]> {
        const profiles = customer.billingProfiles ?? []
        const mappings = await mapYield(profiles, (profile, index) => {
            const at = (field: keyof internal.CustomerBillingProfile): string => itemPointer(sr, key, customer, 'billingProfiles', index, field)
            const [billingProfile, network] = this.checkProfileNetwork(profile.id, profile.networkId, contact, references, at('id'), at('networkId'))
            const intervalError = billingIntervalError(profile, now)
            if (intervalError)
                throw apiError(this.i18n.t(`errors.${intervalError}`), at('startDate'))
            return internal.BillingMapping.create({
                billingProfileId: billingProfile.id,
                networkId: network ? network.id : null,
                startDate: profile.startDate || undefined,
                endDate: profile.endDate || undefined,
            })
        })
        const openError = billingOpenIntervalError(profiles, isUpdate)
        if (openError)
            throw apiError(this.i18n.t(`errors.${openError.key}`), openError.index == undefined
                ? itemPointer(sr, key, customer, 'billingProfiles')
                : itemPointer(sr, key, customer, 'billingProfiles', openError.index))
        return mappings
    }

    /**
     * @param profilePointer pointer of the billing profile id in the request
     * @param networkPointer pointer of the network id in the request
     */
    private checkProfileNetwork(profileId: number, networkId: number | undefined, contact: internal.Contact, references: CustomerReferences, profilePointer: string, networkPointer?: string): [internal.BillingProfile, internal.BillingNetwork | undefined] {
        const profile = references.billingProfiles.get(profileId)
        const profileError = billingProfileError(profile, contact.reseller_id)
        if (profileError)
            throw apiError(this.i18n.t(`errors.${profileError}`), profilePointer)
        if (networkId == undefined)
            return [profile, undefined]
        const network = references.billingNetworks.get(networkId)
        const networkError = billingNetworkError(network, contact.reseller_id)
        if (networkError)
            throw apiError(this.i18n.t(`errors.${networkError}`), networkPointer)
        return [profile, network]
    }

    private checkPermissions(resellerId: number, sr: ServiceRequest): void {
        if (sr.user.resellerId && sr.user.reseller_id != resellerId) {
            throw new NotFoundException()
        }
    }

    // the email and invoice templates must belong to the contact's reseller
    private checkTemplates(customer: internal.Customer, contact: internal.Contact, references: CustomerReferences, sr: ServiceRequest, key: number | string): void {
        const emailTemplateFields: (keyof internal.Customer)[] = ['subscriberEmailTemplateId', 'passresetEmailTemplateId', 'invoiceEmailTemplateId']
        const resellerTemplates = references.emailTemplates.get(contact.reseller_id)
        const invalid = emailTemplateFields.find(field => customer[field] != undefined
            && !resellerTemplates.some(template => template.id === +customer[field]))
        if (invalid)
            throw apiError(this.i18n.t('errors.EMAIL_TEMPLATE_NOT_FOUND'), itemPointer(sr, key, customer, invalid))
        if (customer.invoiceTemplateId != undefined
            && references.invoiceTemplateResellerIds.get(customer.invoiceTemplateId) !== contact.reseller_id)
            throw apiError(this.i18n.t('errors.INVOICE_TEMPLATE_NOT_FOUND', {args: {id: customer.invoiceTemplateId}}), itemPointer(sr, key, customer, 'invoiceTemplateId'))
    }

    private async assignDefaultEmailTemplates(customer: internal.Customer, references: CustomerReferences): Promise<void> {
        const resellerId = references.contacts.get(customer.contactId).reseller_id
        const resellerTemplates = references.emailTemplates.get(resellerId)

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
            if (defaultTemplate) {
                const id = await this.customerRepository.createResellerDefaultTemplate(resellerId, defaultTemplate)
                // the next customers of the reseller use the created template
                resellerTemplates.push({...defaultTemplate, id, resellerId})
                customer[field] = id
            }
        }
    }
}
