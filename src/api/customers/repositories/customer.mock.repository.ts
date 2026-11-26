import {NotFoundException} from '@nestjs/common'

import {CustomerFilterBy} from './customer.mariadb.repository'

import {CustomerRepository} from '~/api/customers/interfaces/customer.repository'
import {internal} from '~/entities'
import {BillingNetworkStatus} from '~/entities/internal/billing-network.internal.entity'
import {BillingProfileStatus} from '~/entities/internal/billing-profile.internal.entity'
import {ContactStatus} from '~/entities/internal/contact.internal.entity'
import {ContractBillingProfileDefinition, ContractStatus} from '~/entities/internal/contract.internal.entity'
import {CustomerType} from '~/entities/internal/customer.internal.entity'
import {ProductClass} from '~/entities/internal/product.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {memoryFieldSource} from '~/helpers/lazy-field.helper'
import {LazyFieldSources} from '~/interfaces/lazy-field-source.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export class CustomerMockRepository implements CustomerRepository {
    readonly customerDB: {[key: number]: internal.Customer}
    readonly billingProfileDB: {[key: number]: internal.BillingProfile}
    readonly billingNetworkDB: {[key: number]: internal.BillingNetwork}
    readonly profilePackageDB: {[key: number]: internal.ProfilePackage}
    readonly contactDB: {[key: number]: internal.Contact}
    readonly productDB: {[key: string]: internal.Product}
    readonly defaultEmailTemplates: internal.EmailTemplate[]
    readonly resellerEmailTemplates: {[key: number]: internal.EmailTemplate[]}
    readonly invoiceTemplateResellerIds: {[key: number]: number}
    readonly lazyFields: LazyFieldSources = {
        billing_profiles: memoryFieldSource('billingProfiles', id => this.customerDB[id]),
        future_billing_profiles: memoryFieldSource('futureBillingProfiles', id => this.customerDB[id]),
    }

    constructor() {
        this.customerDB = {
            1: internal.Customer.create({
                id: 1, contactId: 2, status: ContractStatus.Active, type: CustomerType.SipAccount,
                billingProfileId: 1, billingProfileDefinition: ContractBillingProfileDefinition.ID,
            }),
            2: internal.Customer.create({
                id: 2, contactId: 4, status: ContractStatus.Active, type: CustomerType.PbxAccount,
                billingProfileId: 1, profilePackageId: 1,
            }),
            3: internal.Customer.create({
                id: 3, contactId: 3, status: ContractStatus.Active, type: CustomerType.SipAccount,
                billingProfileId: 3,
            }),
        }
        this.contactDB = {
            2: internal.Contact.create({id: 2, reseller_id: 1, status: ContactStatus.Active}),
            3: internal.Contact.create({id: 3, reseller_id: 1, status: ContactStatus.Active}),
            4: internal.Contact.create({id: 4, reseller_id: 2, status: ContactStatus.Active}),
        }
        this.billingProfileDB = {
            1: internal.BillingProfile.create({id: 1, resellerId: 1, status: BillingProfileStatus.Active} as internal.BillingProfile),
            2: internal.BillingProfile.create({id: 2, resellerId: 2, status: BillingProfileStatus.Active} as internal.BillingProfile),
            3: internal.BillingProfile.create({id: 3, resellerId: 1, status: BillingProfileStatus.Active} as internal.BillingProfile),
            4: internal.BillingProfile.create({id: 4, resellerId: 1, status: BillingProfileStatus.Terminated} as internal.BillingProfile),
        }
        this.billingNetworkDB = {
            1: internal.BillingNetwork.create({id: 1, resellerId: 1, name: 'net1', description: 'net1', status: BillingNetworkStatus.Active}),
            2: internal.BillingNetwork.create({id: 2, resellerId: 2, name: 'net2', description: 'net2', status: BillingNetworkStatus.Active}),
        }
        this.profilePackageDB = {
            1: internal.ProfilePackage.create({
                id: 1, resellerId: 1, name: 'pkg1', description: 'pkg1',
                profilePackageSets: [
                    {profile_id: 1, network_id: undefined},
                    {profile_id: 3, network_id: 1},
                ],
            } as internal.ProfilePackage),
            2: internal.ProfilePackage.create({
                id: 2, resellerId: 2, name: 'pkg2', description: 'pkg2', profilePackageSets: [{profile_id: 2}],
            } as internal.ProfilePackage),
        }
        this.productDB = {
            [CustomerType.SipAccount]: internal.Product.create({id: 4, handle: 'SIP_ACCOUNT', class: ProductClass.SipAccount} as internal.Product),
            [CustomerType.PbxAccount]: internal.Product.create({id: 5, handle: 'PBX_ACCOUNT', class: ProductClass.PbxAccount} as internal.Product),
        }
        this.defaultEmailTemplates = [
            {id: 1, resellerId: null, name: 'subscriber_default_email'} as internal.EmailTemplate,
            {id: 2, resellerId: null, name: 'passreset_default_email'} as internal.EmailTemplate,
            {id: 3, resellerId: null, name: 'invoice_default_email'} as internal.EmailTemplate,
        ]
        this.resellerEmailTemplates = {
            1: [
                {id: 11, resellerId: 1, name: 'subscriber_default_email'} as internal.EmailTemplate,
                {id: 12, resellerId: 1, name: 'passreset_default_email'} as internal.EmailTemplate,
                {id: 13, resellerId: 1, name: 'invoice_default_email'} as internal.EmailTemplate,
                {id: 14, resellerId: 1, name: 'custom_email'} as internal.EmailTemplate,
            ],
            2: [],
            3: [
                {id: 31, resellerId: 3, name: 'subscriber_default_email'} as internal.EmailTemplate,
            ],
        }
        this.invoiceTemplateResellerIds = {1: 1, 2: 2}
    }

    create(customers: internal.Customer[], _sr: ServiceRequest): Promise<number[]> {
        const ids: number[] = []
        for (const customer of customers) {
            const id = this.getNextId(this.customerDB)
            this.customerDB[id] = internal.Customer.create({...customer, id})
            ids.push(id)
        }
        return Promise.resolve(ids)
    }

    appendBillingMappings(_customerId: number, _mappings: internal.BillingMapping[], _now?: Date, _deleteMappings?: boolean): Promise<void> {
        return Promise.resolve()
    }

    createInitialBalances(_customers: internal.Customer[]): Promise<void> {
        return Promise.resolve()
    }

    readActualBillingProfile(_contractId: number, _at?: Date): Promise<internal.BillingProfile> {
        return Promise.resolve(this.billingProfileDB[1])
    }

    readProductsByTypes(types: string[]): Promise<internal.Product[]> {
        return Promise.resolve(types.filter(type => this.productDB[type]).map(type => this.productDB[type]))
    }

    readAll(_sr: ServiceRequest, filterBy?: CustomerFilterBy): Promise<[internal.Customer[], number]> {
        const customers = Object.values(this.customerDB).filter(c => this.matches(c, filterBy))
        return Promise.resolve([customers, customers.length])
    }

    readById(id: number, _sr: ServiceRequest, filterBy?: CustomerFilterBy): Promise<internal.Customer> {
        const customer = this.customerDB[id]
        if (!customer || !this.matches(customer, filterBy))
            throw new NotFoundException()
        return Promise.resolve(customer)
    }

    readBareById(id: number, sr: ServiceRequest, filterBy?: CustomerFilterBy): Promise<internal.Customer> {
        return this.readById(id, sr, filterBy)
    }

    readByIds(ids: number[], sr: ServiceRequest, filterBy?: CustomerFilterBy): Promise<internal.Customer[]> {
        return this.readWhereInIds(ids, sr, filterBy)
    }

    readWhereInIds(ids: number[], _sr: ServiceRequest, filterBy?: CustomerFilterBy): Promise<internal.Customer[]> {
        return Promise.resolve(ids.map(id => this.customerDB[id]).filter(c => c && this.matches(c, filterBy)))
    }

    update(updates: Dictionary<internal.Customer>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => +id)
        for (const id of ids) {
            if (!this.customerDB[id])
                throw new NotFoundException()
            this.customerDB[id] = internal.Customer.create({...this.customerDB[id], ...updates[id], id})
        }
        return Promise.resolve(ids)
    }

    delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        return Promise.resolve(ids)
    }

    readBillingProfiles(ids: number[]): Promise<internal.BillingProfile[]> {
        return Promise.resolve(ids.map(id => this.billingProfileDB[id]).filter(profile => profile))
    }

    readBillingNetworks(ids: number[]): Promise<internal.BillingNetwork[]> {
        return Promise.resolve(ids.map(id => this.billingNetworkDB[id]).filter(network => network))
    }

    readProfilePackagesWithInitialProfiles(ids: number[]): Promise<internal.ProfilePackage[]> {
        return Promise.resolve(ids.map(id => this.profilePackageDB[id]).filter(profilePackage => profilePackage))
    }

    findDefaultEmailTemplates(): Promise<internal.EmailTemplate[]> {
        return Promise.resolve(this.defaultEmailTemplates)
    }

    readEmailTemplatesOfResellers(resellerIds: number[]): Promise<internal.EmailTemplate[]> {
        return Promise.resolve(resellerIds.flatMap(id => this.resellerEmailTemplates[id] ?? []))
    }

    createResellerDefaultTemplate(resellerId: number, defaultTemplate: internal.EmailTemplate): Promise<number> {
        const id = 100 + Object.values(this.resellerEmailTemplates).flat().length
        this.resellerEmailTemplates[resellerId] = [
            ...this.resellerEmailTemplates[resellerId] ?? [],
            {...defaultTemplate, id, resellerId} as internal.EmailTemplate,
        ]
        return Promise.resolve(id)
    }

    readInvoiceTemplateResellerIds(ids: number[]): Promise<Map<number, number>> {
        return Promise.resolve(new Map(ids
            .filter(id => this.invoiceTemplateResellerIds[id] != undefined)
            .map(id => [id, this.invoiceTemplateResellerIds[id]])))
    }

    private matches(customer: internal.Customer, filterBy?: CustomerFilterBy): boolean {
        if (filterBy?.resellerId != undefined && this.contactDB[customer.contactId]?.reseller_id != filterBy.resellerId)
            return false
        if (!filterBy?.showTerminated && customer.status === ContractStatus.Terminated)
            return false
        return true
    }

    private getNextId(db: object): number {
        const keys = Object.keys(db)
        return (+keys[keys.length - 1]) + 1
    }
}
