import {Inject, Injectable, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {CustomerFindOptions} from './interfaces/customer-find-options.interface'
import {CustomerMariadbRepository} from './repositories/customer.mariadb.repository'

import {ContactOptions} from '~/api/contacts/interfaces/contact-options.interface'
import {ContactMariadbRepository} from '~/api/contacts/repositories/contact.mariadb.repository'
import {AppService} from '~/app.service'
import {RbacRole} from '~/config/constants.config'
import {internal} from '~/entities'
import {ContactStatus, ContactType} from '~/entities/internal/contact.internal.entity'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'

@Injectable()
export class CustomerService implements CrudService<internal.Customer> {

    constructor(
        private readonly app: AppService,
        @Inject(CustomerMariadbRepository) private readonly customerRepo: CustomerMariadbRepository,
        @Inject(ContactMariadbRepository) private readonly contactRepo: ContactMariadbRepository,
        @Inject(I18nService) private readonly i18n: I18nService,
    ) {
    }

    async create(customers: internal.Customer[], sr: ServiceRequest): Promise<internal.Customer[]> {
        const now = new Date(Date.now())
        for (const customer of customers) {
            await this.validateBillingMappingDefinition(customer)
            await this.validateTemplates(customer, sr)

            customer.allBillingMappings = await this.prepareBillingMappings(customer, sr)
            await this.setProductId(customer, sr)
            customer.createTimestamp = now
            customer.modifyTimestamp = now
        }
        const createdIds = await this.customerRepo._create(customers, now, sr)
        const createdCustomers =  await this.customerRepo._readWhereInIds(createdIds, this.customerFindOptionsFromServiceRequest(sr))
        for (const customer of createdCustomers) {
            const currentProfile = await this.customerRepo._readCurrentBillingProfile(customer.id)
            customer.futureMappings = await this.customerRepo._readFutureBillingMappings(customer.id)
            customer.allBillingMappings = await this.customerRepo._readAllBillingMappings(customer.id)
            customer.billingProfileId = currentProfile.id
        }
        return createdCustomers
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Customer> {
        const customer = await this.customerRepo._read(id, sr, this.customerFindOptionsFromServiceRequest(sr))
        const currentProfile = await this.customerRepo._readCurrentBillingProfile(id)
        customer.futureMappings = await this.customerRepo._readFutureBillingMappings(id)
        customer.allBillingMappings = await this.customerRepo._readAllBillingMappings(id)
        customer.billingProfileId = currentProfile.id
        return customer
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Customer[], number]> {
        const [customers, count] = await this.customerRepo._readAll(sr, this.customerFindOptionsFromServiceRequest(sr))
        for (const customer of customers) {
            const id = customer.id
            const currentProfile = await this.customerRepo._readCurrentBillingProfile(id)
            customer.futureMappings = await this.customerRepo._readFutureBillingMappings(id)
            customer.allBillingMappings = await this.customerRepo._readAllBillingMappings(id)
            customer.billingProfileId = currentProfile.id
        }
        return [customers, count]
    }

    async update(updates: Dictionary<internal.Customer>, sr: ServiceRequest): Promise<number[]> {
        const now = new Date(Date.now())
        const ids = Object.keys(updates).map(id => parseInt(id))
        const findOptions = this.customerFindOptionsFromServiceRequest(sr)
        if (await this.customerRepo._readCountOfIds(ids, findOptions) != ids.length)
            throw new UnprocessableEntityException()

        const appendBillingMappingsForId = []

        for (const id of ids) {
            const newEntity = updates[id]
            newEntity.modifyTimestamp = now

            const oldEntity = await this.customerRepo._read(id, sr, findOptions)

            if (oldEntity.status == ContractStatus.Terminated) {
                throw new UnprocessableEntityException(`customer (id ${id}) is already terminated and cannot be changed`)
            }
            if (newEntity.status == ContractStatus.Terminated) {
                newEntity.terminateTimestamp = now
                continue
            }

            if (this.templateChanged(newEntity, oldEntity))
                await this.validateTemplates(newEntity, sr)

            if (newEntity.profilePackageId || newEntity.billingProfileId) {
                if (newEntity.profilePackageId && newEntity.profilePackageId != oldEntity.profilePackageId) {
                    delete (newEntity.billingProfileId)
                    newEntity.allBillingMappings = await this.prepareBillingMappings(newEntity, sr, now)
                    appendBillingMappingsForId.push(id)
                }
                if (newEntity.billingProfileId && newEntity.billingProfileId != oldEntity.billingProfileId) {
                    delete (newEntity.profilePackageId)
                    newEntity.allBillingMappings = await this.prepareBillingMappings(newEntity, sr, now)
                    appendBillingMappingsForId.push(id)
                }
            }
        }
        const updatedIds = await this.customerRepo._update(updates, sr)
        for (const id of appendBillingMappingsForId) {
            await this.customerRepo._appendBillingMappings(id, now, updates[id].allBillingMappings)
        }
        return updatedIds
    }

    /**
     * Reads `internal.Contact` belonging to `internal.Customer`
     *
     * Filters by `resellerId` if the RBAC role requires it and fails if the `contact_id` is invalid or the contact
     * has been terminated
     *
     * @param customer
     * @param sr
     * @private
     */
    private async getContactFromCustomer(customer: internal.Customer, sr: ServiceRequest): Promise<internal.Contact> {
        let contact: internal.Contact
        try {
            const options: ContactOptions = {type: ContactType.CustomerContact}
            if (sr.user.role == RbacRole.reseller || sr.user.role == RbacRole.ccare)
                options.filterBy = {resellerId: sr.user.reseller_id}
            contact = await this.contactRepo.readById(customer.contactId, options)
        } catch {
            throw new UnprocessableEntityException(this.i18n.t('errors.CONTACT_ID_INVALID'))
        }
        if (contact.status == ContactStatus.Terminated) {
            throw new UnprocessableEntityException('contact is terminated')
        }
        return contact
    }

    /**
     * Sets the product id on an `internal.Customer`
     * @param customer
     * @param sr
     * @private
     */
    private async setProductId(customer: internal.Customer, sr: ServiceRequest): Promise<void> {
        const product = await this.customerRepo._readProductByType(customer.type, sr)
        if (product == undefined) {
            throw new UnprocessableEntityException(this.i18n.t('errors.TYPE_INVALID'))
        }
        customer.productId = product.id
    }

    /**
     * Compares template IDs of new and old entity and returns `true` if an ID changed else `false`
     * @param newEntity
     * @param oldEntity
     * @private
     */
    private templateChanged(newEntity: internal.Customer, oldEntity: internal.Customer): boolean {
        if (newEntity.invoiceEmailTemplateId != oldEntity.invoiceEmailTemplateId)
            return true
        if (newEntity.passresetEmailTemplateId != oldEntity.passresetEmailTemplateId)
            return true
        if (newEntity.subscriberEmailTemplateId != oldEntity.subscriberEmailTemplateId)
            return true
        return newEntity.invoiceTemplateId != oldEntity.invoiceTemplateId

    }

    private async validateTemplates(customer: internal.Customer, sr: ServiceRequest): Promise<void> {
        const contact = await this.getContactFromCustomer(customer, sr)
        await this.validateEmailTemplates(customer, contact.reseller_id)
        await this.validateInvoiceTemplate(customer, contact.reseller_id)
    }

    private async validateEmailTemplates(customer: internal.Customer, resellerId: number): Promise<boolean> {
        const emailTemplateIds: number[] = []
        if (customer.subscriberEmailTemplateId)
            emailTemplateIds.push(customer.subscriberEmailTemplateId)
        if (customer.passresetEmailTemplateId)
            emailTemplateIds.push(customer.passresetEmailTemplateId)
        if (customer.invoiceEmailTemplateId)
            emailTemplateIds.push(customer.invoiceEmailTemplateId)

        if (emailTemplateIds.length > 0) {
            const [_ids, count] = await this.customerRepo._readEmailTemplateIdsByIds(emailTemplateIds, resellerId)
            if (emailTemplateIds.length != count) {
                throw new UnprocessableEntityException('customer contact\'s reseller_id does not match email template reseller id')
            }
        }
        return true
    }

    private async validateInvoiceTemplate(customer: internal.Customer, resellerId: number): Promise<boolean> {
        if (customer.invoiceTemplateId) {
            await this.customerRepo._readInvoiceTemplateById(customer.invoiceTemplateId, resellerId)
        }
        return true
    }

    /**
     * Checks if the billing mapping definition is valid
     * @param customer `internal.Customer` to be validated
     * @throws UnprocessableEntityException if both `billingProfileId` and `profilePackageId` are set
     * @throws UnprocessableEntityException if neither `billingProfileId` nor `profilePackageId` are set
     * @private
     */
    private async validateBillingMappingDefinition(customer: internal.Customer): Promise<void> {
        if (customer.billingProfileId && customer.profilePackageId) {
            throw new UnprocessableEntityException('cannot provide "billing_profile_id" and "profile_package_id" simultaneously')
        }
        if (!customer.billingProfileId && !customer.profilePackageId) {
            throw new UnprocessableEntityException('no "billing_profile_id" or "profile_package_id" provided')
        }
    }

    private async validateUpdate(_oldEntity: internal.Customer, newEntity: internal.Customer, sr: ServiceRequest): Promise<boolean> {
        await this.getContactFromCustomer(newEntity, sr)
        return true
    }

    /**
     * Returns `internal.BillingMapping[]` for an `internal.Customer`
     *
     * @param customer `internal.Customer` to fetch `internal.BillingMapping[]` for
     * @param sr
     * @param now sets the `startDate` of `internal.BillingMapping` to `now` if defined
     *
     * @returns `internal.BillingMapping[]` depending on whether `profilePackageId` or `billingProfileId` is set on the customer
     * @private
     */
    private async prepareBillingMappings(customer: internal.Customer, sr: ServiceRequest, now?: Date): Promise<internal.BillingMapping[]> {
        return customer.profilePackageId ? this.getMappingsByProfilePackage(customer, sr, now) : this.getMappingsByBillingProfile(customer, sr, now)
    }

    /**
     * Returns `internal.BillingMapping[]` by `profilePackageId`
     * @param customer
     * @param sr
     * @param now
     * @private
     */
    private async getMappingsByProfilePackage(customer: internal.Customer, sr: ServiceRequest, now?: Date): Promise<internal.BillingMapping[]> {
        const contact = await this.getContactFromCustomer(customer, sr)
        const mappings: internal.BillingMapping[] = []
        const profilePackage = await this.customerRepo._readProfilePackageById(customer.profilePackageId)
        if (profilePackage.resellerId != contact.reseller_id) {
            throw new UnprocessableEntityException('reseller_id of contact and profile package does not match')
        }
        profilePackage.profilePackageSets.map(packageSet => mappings.push(
            internal.BillingMapping.create({
                billingProfileId: packageSet.profile_id,
                networkId: packageSet.network_id,
                startDate: now,
                endDate: undefined,
            }),
        ))
        return mappings
    }

    /**
     * Returns `internal.BillingMappings[]` by `billingProfileId`
     * @param customer
     * @param sr
     * @param now
     * @private
     */
    private async getMappingsByBillingProfile(customer: internal.Customer, sr: ServiceRequest, now?: Date): Promise<internal.BillingMapping[]> {
        const contact = await this.getContactFromCustomer(customer, sr)
        const mappings: internal.BillingMapping[] = []
        const billingProfile = await this.customerRepo._readBillingProfileById(customer.billingProfileId)
        if (billingProfile.resellerId != contact.reseller_id) {
            throw new UnprocessableEntityException('reseller_id of contact and billing profile does not match')
        }
        mappings.push(internal.BillingMapping.create({
            billingProfileId: billingProfile.id,
            networkId: undefined,
            startDate: now,
            endDate: undefined,
        }))
        return mappings
    }

    private customerFindOptionsFromServiceRequest(sr: ServiceRequest): CustomerFindOptions {
        switch (sr.user.role) {
        case RbacRole.reseller:
        case RbacRole.ccare:
        case RbacRole.subscriberadmin:
        case RbacRole.subscriber:
            return {
                filterBy: {
                    resellerId: sr.user.reseller_id,
                },
            }
        }
        return undefined
    }
}
