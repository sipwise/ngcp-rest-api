import {NotFoundException} from '@nestjs/common'

import {CustomerFilterBy} from './customer.mariadb.repository'

import {CustomerRepository} from '~/api/customers/interfaces/customer.repository'
import {internal} from '~/entities'
import {BillingNetworkStatus} from '~/entities/internal/billing-network.internal.entity'
import {BillingProfileStatus} from '~/entities/internal/billing-profile.internal.entity'
import {ContactStatus} from '~/entities/internal/contact.internal.entity'
import {ContractBillingProfileDefinition, ContractStatus} from '~/entities/internal/contract.internal.entity'
import {CustomerType} from '~/entities/internal/customer.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
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
            [CustomerType.SipAccount]: internal.Product.create({id: 4, handle: 'SIP_ACCOUNT'} as internal.Product),
            [CustomerType.PbxAccount]: internal.Product.create({id: 5, handle: 'PBX_ACCOUNT'} as internal.Product),
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

    createInitialBalance(_customerId: number): Promise<void> {
        return Promise.resolve()
    }

    readActualBillingProfile(_contractId: number, _at?: Date): Promise<internal.BillingProfile> {
        return Promise.resolve(this.billingProfileDB[1])
    }

    readProductByType(type: string, _sr: ServiceRequest): Promise<internal.Product> {
        return Promise.resolve(this.productDB[type])
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

    readAllBillingProfiles(_customerId: number, _sr: ServiceRequest, _filterBy?: CustomerFilterBy): Promise<[internal.CustomerBillingProfile[], number]> {
        return Promise.resolve([[] as internal.CustomerBillingProfile[], 0])
    }

    readFutureBillingProfiles(_customerId: number, _sr: ServiceRequest, _filterBy?: CustomerFilterBy): Promise<[internal.CustomerBillingProfile[], number]> {
        return Promise.resolve([[] as internal.CustomerBillingProfile[], 0])
    }

    readBillingProfile(profileId: number, _sr: ServiceRequest): Promise<internal.BillingProfile> {
        return Promise.resolve(this.billingProfileDB[profileId])
    }

    readBillingNetwork(networkId: number, _sr: ServiceRequest): Promise<internal.BillingNetwork> {
        return Promise.resolve(this.billingNetworkDB[networkId])
    }

    readProfilePackageWithInitialProfiles(packageId: number, _sr: ServiceRequest): Promise<internal.ProfilePackage> {
        return Promise.resolve(this.profilePackageDB[packageId])
    }

    findDefaultEmailTemplates(): Promise<internal.EmailTemplate[]> {
        return Promise.resolve(this.defaultEmailTemplates)
    }

    findResellerEmailTemplates(resellerId: number): Promise<internal.EmailTemplate[]> {
        return Promise.resolve(this.resellerEmailTemplates[resellerId] ?? [])
    }

    createResellerDefaultTemplate(resellerId: number, defaultTemplate: internal.EmailTemplate): Promise<number> {
        const id = 100 + Object.values(this.resellerEmailTemplates).flat().length
        this.resellerEmailTemplates[resellerId] = [
            ...this.resellerEmailTemplates[resellerId] ?? [],
            {...defaultTemplate, id, resellerId} as internal.EmailTemplate,
        ]
        return Promise.resolve(id)
    }

    readEmailTemplateIdsByIds(ids: number[], resellerId: number): Promise<[number[], number]> {
        const readIds = (this.resellerEmailTemplates[resellerId] ?? [])
            .map(template => template.id)
            .filter(id => ids.includes(id))
        return Promise.resolve([readIds, readIds.length])
    }

    readCountOfInvoiceTemplates(ids: number[], resellerId: number): Promise<number> {
        return Promise.resolve(ids.filter(id => this.invoiceTemplateResellerIds[id] == resellerId).length)
    }

    readContactById(contactId: number): Promise<internal.Contact> {
        return Promise.resolve(this.contactDB[contactId])
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
