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
import {ServiceRequest} from '~/interfaces/service-request.interface'

export class SubscriberMockRepository implements SubscriberRepository {
    readonly subscriberDB: {[key: number]: internal.Subscriber} = {}
    readonly customerDB: {[key: number]: SubscriberCustomer} = {}
    readonly domainDB: {[key: number]: SubscriberDomain} = {}
    readonly profileSetDB: {[key: number]: {id: number, resellerId: number}} = {}
    readonly profileDB: {[key: number]: SubscriberProfileRow} = {}
    readonly plans: SubscriberWritePlan[] = []
    readonly terminatePlans: SubscriberTerminatePlan[] = []

    async readAll(_sr: ServiceRequest, scope: SubscriberScope): Promise<[internal.Subscriber[], number]> {
        const rows = this.visible(scope)
        return [rows, rows.length]
    }

    async readById(id: number, scope: SubscriberScope): Promise<internal.Subscriber | undefined> {
        return this.visible(scope).find(s => s.id == id)
    }

    async readWhereInIds(ids: number[], scope: SubscriberScope): Promise<internal.Subscriber[]> {
        return this.visible(scope).filter(s => ids.includes(s.id))
    }

    async readPilot(customerId: number): Promise<internal.Subscriber | undefined> {
        return this.visible({customerId}).find(s => s.isPbxPilot)
    }

    async readByCustomer(customerId: number): Promise<internal.Subscriber[]> {
        return this.visible({customerId})
    }

    async readCustomers(ids: number[], resellerId?: number): Promise<SubscriberCustomer[]> {
        return Object.values(this.customerDB).filter(c => ids.includes(c.id) && (resellerId == undefined || c.resellerId == resellerId))
    }

    async lockContracts(_ids: number[]): Promise<void> {
        return
    }

    async readDomain(domain: {id?: number, name?: string}): Promise<SubscriberDomain | undefined> {
        return Object.values(this.domainDB).find(d => domain.id != undefined ? d.id == domain.id : d.domain == domain.name)
    }

    async countActive(customerId: number): Promise<number> {
        return this.visible({customerId}).length
    }

    async countActiveByReseller(resellerId: number): Promise<number> {
        return this.visible({resellerId}).length
    }

    async existsUsername(username: string, domainId: number): Promise<boolean> {
        return this.visible({}).some(s => s.username == username && s.domainId == domainId)
    }

    async existsWebusername(webusername: string, provisioningDomainId: number, excludeProvisioningId?: number): Promise<boolean> {
        const domain = Object.values(this.domainDB).find(d => d.provisioningId == provisioningDomainId)
        return this.visible({}).some(s => s.webusername == webusername && s.domainId == domain?.id && s.provisioningId != excludeProvisioningId)
    }

    async extensionInUse(customerId: number, extension: string, excludeId?: number): Promise<boolean> {
        return this.visible({customerId}).some(s => s.pbxExtension == extension && s.id != excludeId)
    }

    async readNumbers(numbers: SubscriberNumber[]): Promise<SubscriberNumberRow[]> {
        const rows: SubscriberNumberRow[] = []
        for (const subscriber of this.visible({})) {
            for (const number of [subscriber.primaryNumber, ...subscriber.aliasNumbers].filter(n => n != null)) {
                if (numbers.some(n => n.cc == number.cc && (n.ac ?? '') == (number.ac ?? '') && n.sn == number.sn))
                    rows.push({id: number.numberId, cc: number.cc, ac: number.ac, sn: number.sn, subscriberId: subscriber.id})
            }
        }
        return rows
    }

    async readAliasOwners(_usernames: string[]): Promise<Map<string, number[]>> {
        return new Map()
    }

    async readRefs(ids: number[], customerId: number, groups: boolean): Promise<SubscriberRef[]> {
        return this.visible({customerId})
            .filter(s => ids.includes(s.id) && (groups ? s.isPbxGroup : !s.isPbxGroup && !s.isPbxPilot))
            .map(s => ({id: s.id, provisioningId: s.provisioningId, uri: `sip:${s.username}@${s.domain}`}))
    }

    async readProfileSet(id: number): Promise<{id: number, resellerId: number} | undefined> {
        return this.profileSetDB[id]
    }

    async readProfiles(setId: number): Promise<SubscriberProfileRow[]> {
        return Object.values(this.profileDB).filter(p => p.setId == setId)
    }

    async readProfileAttributeIds(_profileId: number): Promise<number[]> {
        return []
    }

    async readPreferences(_provisioningId: number, _attributes: string[]): Promise<Map<string, string[]>> {
        return new Map()
    }

    async readPasswordJournal(_provisioningId: number, _web: boolean): Promise<string[]> {
        return []
    }

    async create(plan: SubscriberWritePlan): Promise<number> {
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
        return id
    }

    async update(plan: SubscriberWritePlan): Promise<void> {
        this.subscriberDB[plan.subscriber.id] = Object.assign(new internal.Subscriber(), this.subscriberDB[plan.subscriber.id], plan.subscriber)
        this.plans.push(plan)
    }

    async terminate(plan: SubscriberTerminatePlan): Promise<void> {
        delete this.subscriberDB[plan.subscriber.id]
        this.terminatePlans.push(plan)
    }

    async setCustomerPreference(_customerId: number, _attribute: string, _value: string): Promise<void> {
        return
    }

    private visible(scope: SubscriberScope): internal.Subscriber[] {
        return Object.values(this.subscriberDB).filter(s =>
            (scope.resellerId == undefined || s.resellerId == scope.resellerId)
            && (scope.customerId == undefined || s.customerId == scope.customerId)
            && (scope.subscriberId == undefined || s.id == scope.subscriberId),
        )
    }
}
