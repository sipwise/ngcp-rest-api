import {
    SubscriberCustomer,
    SubscriberDomain,
    SubscriberNumberRow,
    SubscriberProfileRow,
    SubscriberRef,
    SubscriberRepository,
    SubscriberScope,
    SubscriberTerminatePlan,
    SubscriberWritePlan,
} from '~/api/subscribers/interfaces/subscriber.repository'
import {internal} from '~/entities'
import {SubscriberNumber} from '~/entities/internal/subscriber.internal.entity'
import {memoryFieldSource} from '~/helpers/lazy-field.helper'
import {LazyFieldSources} from '~/interfaces/lazy-field-source.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export class SubscriberMockRepository implements SubscriberRepository {
    readonly subscriberDB: {[key: number]: internal.Subscriber} = {}
    readonly customerDB: {[key: number]: SubscriberCustomer} = {}
    readonly domainDB: {[key: number]: SubscriberDomain} = {}
    readonly profileSetDB: {[key: number]: {id: number, resellerId: number}} = {}
    readonly profileDB: {[key: number]: SubscriberProfileRow} = {}
    readonly plans: SubscriberWritePlan[] = []
    readonly terminatePlans: SubscriberTerminatePlan[] = []
    readonly lazyFields: LazyFieldSources = {
        alias_numbers: memoryFieldSource('aliasNumbers', id => this.subscriberDB[id]),
        pbx_group_ids: memoryFieldSource('pbxGroupIds', id => this.subscriberDB[id]),
        pbx_groupmember_ids: memoryFieldSource('pbxGroupmemberIds', id => this.subscriberDB[id]),
    }

    readAll(_sr: ServiceRequest, scope: SubscriberScope): Promise<[internal.Subscriber[], number]> {
        const rows = this.visible(scope)
        return Promise.resolve([rows, rows.length])
    }

    readById(id: number, scope: SubscriberScope): Promise<internal.Subscriber | undefined> {
        return Promise.resolve(this.visible(scope).find(s => s.id == id))
    }

    readWhereInIds(ids: number[], scope: SubscriberScope): Promise<internal.Subscriber[]> {
        return Promise.resolve(this.visible(scope).filter(s => ids.includes(s.id)))
    }

    async readBareById(id: number, scope: SubscriberScope): Promise<internal.Subscriber | undefined> {
        return this.readById(id, scope)
    }

    readPilot(customerId: number): Promise<internal.Subscriber | undefined> {
        return Promise.resolve(this.visible({customerId}).find(s => s.isPbxPilot))
    }

    readByCustomer(customerId: number): Promise<internal.Subscriber[]> {
        return Promise.resolve(this.visible({customerId}))
    }

    readCustomers(ids: number[], resellerId?: number): Promise<SubscriberCustomer[]> {
        return Promise.resolve(Object.values(this.customerDB).filter(c => ids.includes(c.id) && (resellerId == undefined || c.resellerId == resellerId)))
    }

    lockContracts(_ids: number[]): Promise<void> {
        return Promise.resolve()
    }

    readDomain(domain: {id?: number, name?: string}): Promise<SubscriberDomain | undefined> {
        return Promise.resolve(Object.values(this.domainDB).find(d => domain.id != undefined ? d.id == domain.id : d.domain == domain.name))
    }

    countActive(customerId: number): Promise<number> {
        return Promise.resolve(this.visible({customerId}).length)
    }

    countActiveByReseller(resellerId: number): Promise<number> {
        return Promise.resolve(this.visible({resellerId}).length)
    }

    existsUsername(username: string, domainId: number): Promise<boolean> {
        return Promise.resolve(this.visible({}).some(s => s.username == username && s.domainId == domainId))
    }

    existsWebusername(webusername: string, provisioningDomainId: number, excludeProvisioningId?: number): Promise<boolean> {
        const domain = Object.values(this.domainDB).find(d => d.provisioningId == provisioningDomainId)
        return Promise.resolve(this.visible({}).some(s => s.webusername == webusername && s.domainId == domain?.id && s.provisioningId != excludeProvisioningId))
    }

    extensionInUse(customerId: number, extension: string, excludeId?: number): Promise<boolean> {
        return Promise.resolve(this.visible({customerId}).some(s => s.pbxExtension == extension && s.id != excludeId))
    }

    readNumbers(numbers: SubscriberNumber[]): Promise<SubscriberNumberRow[]> {
        const rows: SubscriberNumberRow[] = []
        for (const subscriber of this.visible({})) {
            for (const number of [subscriber.primaryNumber, ...subscriber.aliasNumbers].filter(n => n != null)) {
                if (numbers.some(n => n.cc == number.cc && (n.ac ?? '') == (number.ac ?? '') && n.sn == number.sn))
                    rows.push({id: number.numberId, cc: number.cc, ac: number.ac, sn: number.sn, subscriberId: subscriber.id})
            }
        }
        return Promise.resolve(rows)
    }

    readAliasOwners(_usernames: string[]): Promise<Map<string, number[]>> {
        return Promise.resolve(new Map<string, number[]>())
    }

    readRefs(ids: number[], customerId: number, groups: boolean): Promise<SubscriberRef[]> {
        return Promise.resolve(this.visible({customerId})
            .filter(s => ids.includes(s.id) && (groups ? s.isPbxGroup : !s.isPbxGroup && !s.isPbxPilot))
            .map(s => ({id: s.id, provisioningId: s.provisioningId, uri: `sip:${s.username}@${s.domain}`})))
    }

    readProfileSet(id: number): Promise<{id: number, resellerId: number} | undefined> {
        return Promise.resolve(this.profileSetDB[id])
    }

    readProfiles(setId: number): Promise<SubscriberProfileRow[]> {
        return Promise.resolve(Object.values(this.profileDB).filter(p => p.setId == setId))
    }

    readProfileAttributeIds(_profileId: number): Promise<number[]> {
        return Promise.resolve<number[]>([])
    }

    readPreferences(_provisioningId: number, _attributes: string[]): Promise<Map<string, string[]>> {
        return Promise.resolve(new Map<string, string[]>())
    }

    readPasswordJournal(_provisioningId: number, _web: boolean): Promise<string[]> {
        return Promise.resolve<string[]>([])
    }

    create(plan: SubscriberWritePlan): Promise<number> {
        const id = Math.max(0, ...Object.keys(this.subscriberDB).map(Number)) + 1
        const customer = this.customerDB[plan.subscriber.customerId]
        this.subscriberDB[id] = Object.assign(new internal.Subscriber(), plan.subscriber, {
            id,
            provisioningId: id,
            customerProductClass: customer?.productClass,
            resellerId: plan.resellerId,
            aliasNumbers: plan.subscriber.aliasNumbers ?? [],
            pbxGroupIds: plan.subscriber.pbxGroupIds ?? [],
            pbxGroupmemberIds: plan.subscriber.pbxGroupmemberIds ?? [],
        })
        this.plans.push(plan)
        return Promise.resolve(id)
    }

    update(plan: SubscriberWritePlan): Promise<void> {
        this.subscriberDB[plan.subscriber.id] = Object.assign(new internal.Subscriber(), this.subscriberDB[plan.subscriber.id], plan.subscriber)
        this.plans.push(plan)
        return Promise.resolve()
    }

    terminate(plan: SubscriberTerminatePlan): Promise<void> {
        delete this.subscriberDB[plan.subscriber.id]
        this.terminatePlans.push(plan)
        return Promise.resolve()
    }

    setCustomerPreference(_customerId: number, _attribute: string, _value: string): Promise<void> {
        return Promise.resolve()
    }

    private visible(scope: SubscriberScope): internal.Subscriber[] {
        return Object.values(this.subscriberDB).filter(s =>
            (scope.resellerId == undefined || s.resellerId == scope.resellerId)
            && (scope.customerId == undefined || s.customerId == scope.customerId)
            && (scope.subscriberId == undefined || s.id == scope.subscriberId),
        )
    }
}
