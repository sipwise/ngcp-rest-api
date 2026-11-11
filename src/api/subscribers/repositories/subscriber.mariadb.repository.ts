import {Injectable} from '@nestjs/common'
import {Brackets, In, InsertResult, Not, SelectQueryBuilder} from 'typeorm'

import {SubscriberSearchDto} from '~/api/subscribers/dto/subscriber-search.dto'
import {
    SubscriberCustomer,
    SubscriberDomain,
    SubscriberNumberAssignment,
    SubscriberNumberRelease,
    SubscriberNumberRow,
    SubscriberPasswordJournalEntry,
    SubscriberProfileRow,
    SubscriberRef,
    SubscriberRepository,
    SubscriberScope,
    SubscriberWritePlan,
} from '~/api/subscribers/interfaces/subscriber.repository'
import {numberString} from '~/api/subscribers/subscriber.rules'
import {db, internal} from '~/entities'
import {ContractStatus} from '~/entities/internal/contract.internal.entity'
import {ProductClass} from '~/entities/internal/product.internal.entity'
import {SubscriberNumber} from '~/entities/internal/subscriber.internal.entity'
import {VoipNumberStatus} from '~/entities/internal/voip-number.internal.entity'
import {VoipSubscriberStatus} from '~/entities/internal/voip-subscriber.internal.entity'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

const subscriberClasses = [
    ProductClass.SipAccount,
    ProductClass.PbxAccount,
]
const callForwardTypes = [
    'cfu',
    'cfb',
    'cft',
    'cfna',
    'cfs',
    'cfr',
]

function insertedId(result: InsertResult): number {
    return (result.identifiers[0] as {id: number}).id
}

interface Target {
    id: number
    provisioningId: number
    provisioningDomainId: number
}

@Injectable()
export class SubscriberMariadbRepository extends MariaDbRepository implements SubscriberRepository {
    private readonly log = new LoggerService(SubscriberMariadbRepository.name)
    private readonly attributeIdCache = new Map<string, number>()

    async readAll(sr: ServiceRequest, scope: SubscriberScope): Promise<[internal.Subscriber[], number]> {
        const qb = await this.createBaseQueryBuilder(scope)
        const searchDto = new SubscriberSearchDto()
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr, Object.keys(searchDto), undefined, searchDto._alias))
        qb.addOrderBy('subscriber.id', 'ASC')
        const [result, totalCount] = await qb.getManyAndCount()
        return [await this.toInternalWithDetails(result), totalCount]
    }

    async readById(id: number, scope: SubscriberScope): Promise<internal.Subscriber | undefined> {
        const qb = await this.createBaseQueryBuilder(scope)
        qb.andWhere('subscriber.id = :id', {id})
        const result = await qb.getOne()
        if (!result)
            return undefined
        return (await this.toInternalWithDetails([result]))[0]
    }

    async readWhereInIds(ids: number[], scope: SubscriberScope): Promise<internal.Subscriber[]> {
        if (!ids.length)
            return []
        const qb = await this.createBaseQueryBuilder(scope)
        qb.andWhereInIds(ids)
        qb.addOrderBy('subscriber.id', 'ASC')
        return await this.toInternalWithDetails(await qb.getMany())
    }

    private createBaseQueryBuilder(scope: SubscriberScope): Promise<SelectQueryBuilder<db.billing.VoipSubscriber>> {
        const qb = db.billing.VoipSubscriber.createQueryBuilder('subscriber')
            .innerJoinAndSelect('subscriber.provisioningVoipSubscriber', 'prov')
            .innerJoin('subscriber.contract', 'contract')
            .addSelect(['contract.id', 'contract.contact_id', 'contract.external_id'])
            .innerJoin('contract.contact', 'contact')
            .addSelect(['contact.id', 'contact.reseller_id'])
            .innerJoin('contract.product', 'product')
            .addSelect(['product.id', 'product.class'])
            .innerJoin('subscriber.domain', 'domain')
            .addSelect(['domain.id', 'domain.domain'])
            .leftJoin('subscriber.contact', 'subscriberContact')
            .addSelect(['subscriberContact.id', 'subscriberContact.email', 'subscriberContact.timezone'])
            .leftJoinAndSelect('subscriber.primaryNumber', 'primaryNumber')
            .where('subscriber.status != :terminated', {terminated: VoipSubscriberStatus.Terminated})
            .andWhere('product.class IN (:...subscriberClasses)', {subscriberClasses})
        if (scope.resellerId != undefined)
            qb.andWhere('contact.reseller_id = :resellerId', {resellerId: scope.resellerId})
        if (scope.customerId != undefined)
            qb.andWhere('subscriber.contract_id = :customerId', {customerId: scope.customerId})
        if (scope.subscriberId != undefined)
            qb.andWhere('subscriber.id = :subscriberId', {subscriberId: scope.subscriberId})
        return Promise.resolve(qb)
    }

    /**
     * Maps the rows and adds alias numbers, preferences, pbx groups and extension ranges, with a fixed number of
     * queries for all rows
     */
    private async toInternalWithDetails(rows: db.billing.VoipSubscriber[]): Promise<internal.Subscriber[]> {
        const subscribers: internal.Subscriber[] = rows.map((row): internal.Subscriber => row.toInternal())
        if (!subscribers.length)
            return subscribers
        await this.addAliasNumbers(subscribers)
        await this.addPreferences(subscribers)
        const pbx = subscribers.filter(s => s.isPbxAccount)
        await this.addPbxGroups(pbx)
        await this.addExtensionRanges(pbx.filter(s => s.administrative))
        return subscribers
    }

    private async addAliasNumbers(subscribers: internal.Subscriber[]): Promise<void> {
        const byId = new Map(subscribers.map(s => [s.id, s]))
        const numbers = await db.billing.VoipNumber.find({
            where: {subscriber_id: In([...byId.keys()])},
            order: {id: 'ASC'},
        })
        const devIdAliases = await db.provisioning.VoipDBAlias.find({
            where: {subscriber_id: In(subscribers.map(s => s.provisioningId)), is_devid: true},
        })
        const devIds = new Set(devIdAliases.map(alias => `${alias.subscriber_id}:${alias.username}`))
        for (const number of numbers) {
            const subscriber = byId.get(number.subscriber_id)
            if (number.id == subscriber.primaryNumber?.numberId)
                continue
            subscriber.aliasNumbers.push({
                numberId: number.id,
                cc: number.cc,
                ac: number.ac,
                sn: number.sn,
                isDevId: devIds.has(`${subscriber.provisioningId}:${number.cc}${number.ac}${number.sn}`),
            })
        }
    }

    private async addPreferences(subscribers: internal.Subscriber[]): Promise<void> {
        const byProvisioningId = new Map(subscribers.map(s => [s.provisioningId, s]))
        const preferences = await db.provisioning.VoipUsrPreference.createQueryBuilder('preference')
            .innerJoinAndSelect('preference.voipPreference', 'attribute')
            .where('preference.subscriber_id IN (:...ids)', {ids: [...byProvisioningId.keys()]})
            .andWhere('attribute.attribute IN (:...attributes)', {attributes: ['display_name', 'lock']})
            .orderBy('preference.id')
            .getMany()
        for (const preference of preferences) {
            const subscriber = byProvisioningId.get(preference.subscriber_id)
            if (preference.voipPreference.attribute == 'display_name')
                subscriber.displayName = preference.value || null
            else
                subscriber.lock = preference.value
        }
    }

    /**
     * Groups of the members and members of the groups, as billing ids in membership order
     */
    private async addPbxGroups(subscribers: internal.Subscriber[]): Promise<void> {
        if (!subscribers.length)
            return
        const byProvisioningId = new Map(subscribers.map(s => [s.provisioningId, s]))
        const ids = [...byProvisioningId.keys()]
        const memberships = await db.provisioning.VoipPbxGroup.find({
            where: [{subscriber_id: In(ids)}, {group_id: In(ids)}],
            order: {id: 'ASC'},
        })
        if (!memberships.length)
            return
        const billingIds = await this.readBillingIds(memberships.flatMap(m => [m.group_id, m.subscriber_id]))
        for (const membership of memberships) {
            const groupId = billingIds.get(membership.group_id)
            const memberId = billingIds.get(membership.subscriber_id)
            if (groupId == undefined || memberId == undefined)
                continue
            byProvisioningId.get(membership.subscriber_id)?.pbxGroupIds.push(groupId)
            byProvisioningId.get(membership.group_id)?.pbxGroupmemberIds.push(memberId)
        }
    }

    private async addExtensionRanges(subscribers: internal.Subscriber[]): Promise<void> {
        if (!subscribers.length)
            return
        const ranges = await db.provisioning.VoipContractPreference.createQueryBuilder('preference')
            .innerJoinAndSelect('preference.voipPreference', 'attribute')
            .where('preference.contract_id IN (:...ids)', {ids: [...new Set(subscribers.map(s => s.customerId))]})
            .andWhere('preference.location_id IS NULL')
            .andWhere('attribute.attribute IN (:...attributes)', {attributes: ['ext_range_min', 'ext_range_max']})
            .orderBy('preference.id')
            .getMany()
        for (const range of ranges) {
            const value = range.value !== '' ? Number(range.value) : null
            for (const subscriber of subscribers.filter(s => s.customerId == range.contract_id)) {
                if (range.voipPreference.attribute == 'ext_range_min')
                    subscriber.extRangeMin = value
                else
                    subscriber.extRangeMax = value
            }
        }
    }

    /**
     * Billing ids by provisioning id
     */
    private async readBillingIds(provisioningIds: number[]): Promise<Map<number, number>> {
        const rows = await db.billing.VoipSubscriber.createQueryBuilder('subscriber')
            .innerJoin('subscriber.provisioningVoipSubscriber', 'prov')
            .select(['subscriber.id', 'prov.id'])
            .where('prov.id IN (:...ids)', {ids: [...new Set(provisioningIds)]})
            .getMany()
        return new Map(rows.map((row): [number, number] => [row.provisioningVoipSubscriber.id, row.id]))
    }

    /* Write context and lookups */

    async readPilot(customerId: number): Promise<internal.Subscriber | undefined> {
        const qb = await this.createBaseQueryBuilder({customerId})
        qb.andWhere('prov.is_pbx_pilot = 1')
        const row = await qb.getOne()
        return row ? (await this.toInternalWithDetails([row]))[0] : undefined
    }

    async readByCustomer(customerId: number): Promise<internal.Subscriber[]> {
        const qb = await this.createBaseQueryBuilder({customerId})
        qb.orderBy('subscriber.id', 'ASC')
        return await this.toInternalWithDetails(await qb.getMany())
    }

    async readCustomers(ids: number[], resellerId?: number): Promise<SubscriberCustomer[]> {
        if (!ids.length)
            return []
        const qb = db.billing.Contract.createQueryBuilder('contract')
            .innerJoinAndSelect('contract.contact', 'contact')
            .innerJoinAndSelect('contract.product', 'product')
            .where('contract.id IN (:...ids)', {ids})
            .andWhere('contract.status != :terminated', {terminated: ContractStatus.Terminated})
            .andWhere('product.class IN (:...subscriberClasses)', {subscriberClasses})
        if (resellerId != undefined)
            qb.andWhere('contact.reseller_id = :resellerId', {resellerId})
        const contracts = await qb.getMany()
        if (!contracts.length)
            return []
        const resellers = await db.billing.Reseller.find({where: {id: In([...new Set(contracts.map(c => c.contact.reseller_id))])}})
        const resellerContracts = await db.billing.Contract.find({where: {id: In(resellers.map(r => r.contract_id))}})
        const ranges = await db.provisioning.VoipContractPreference.createQueryBuilder('preference')
            .innerJoinAndSelect('preference.voipPreference', 'attribute')
            .where('preference.contract_id IN (:...ids)', {ids: contracts.map(c => c.id)})
            .andWhere('preference.location_id IS NULL')
            .andWhere('attribute.attribute IN (:...attributes)', {attributes: ['ext_range_min', 'ext_range_max']})
            .getMany()
        const soundSets = await db.provisioning.VoipSoundSet.find({
            where: {contract_id: In(contracts.map(c => c.id)), contract_default: true},
            order: {id: 'ASC'},
        })
        return contracts.map((contract): SubscriberCustomer => {
            const reseller = resellers.find(r => r.id == contract.contact.reseller_id)
            const resellerContract = resellerContracts.find(c => c.id == reseller?.contract_id)
            const range = (attribute: string): number | null => {
                const value = ranges.find(r => r.contract_id == contract.id && r.voipPreference.attribute == attribute)?.value
                return value != undefined && value !== '' ? +value : null
            }
            return {
                id: contract.id,
                productClass: contract.product.class as ProductClass,
                externalId: contract.external_id ?? null,
                maxSubscribers: contract.max_subscribers ?? null,
                resellerId: contract.contact.reseller_id,
                resellerContractId: reseller?.contract_id,
                resellerMaxSubscribers: resellerContract?.max_subscribers ?? null,
                extRangeMin: range('ext_range_min'),
                extRangeMax: range('ext_range_max'),
                soundSetId: soundSets.find(set => set.contract_id == contract.id)?.id ?? null,
            }
        })
    }

    /**
     * Row locks on the contracts, in id order so concurrent writers wait instead of deadlocking
     */
    async lockContracts(ids: number[]): Promise<void> {
        const unique = [...new Set(ids.filter(id => id != undefined))].sort((a, b) => a - b)
        if (!unique.length)
            return
        await db.billing.Contract.createQueryBuilder('contract')
            .select('contract.id')
            .where('contract.id IN (:...ids)', {ids: unique})
            .orderBy('contract.id')
            .setLock('pessimistic_write')
            .getMany()
    }

    async readDomain(domain: {id?: number, name?: string}): Promise<SubscriberDomain | undefined> {
        const row = domain.id != undefined
            ? await db.billing.Domain.findOne({where: {id: domain.id}})
            : await db.billing.Domain.findOne({where: {domain: domain.name}})
        if (!row)
            return undefined
        const provisioning = await db.provisioning.VoipDomain.findOne({where: {domain: row.domain}})
        if (!provisioning)
            return undefined
        return {id: row.id, domain: row.domain, resellerId: row.reseller_id ?? null, provisioningId: provisioning.id}
    }

    async countActive(customerId: number): Promise<number> {
        return await db.billing.VoipSubscriber.count({
            where: {contract_id: customerId, status: Not(VoipSubscriberStatus.Terminated)},
        })
    }

    async countActiveByReseller(resellerId: number): Promise<number> {
        return await db.billing.VoipSubscriber.createQueryBuilder('subscriber')
            .innerJoin('subscriber.contract', 'contract')
            .innerJoin('contract.contact', 'contact')
            .where('contact.reseller_id = :resellerId', {resellerId})
            .andWhere('subscriber.status != :terminated', {terminated: VoipSubscriberStatus.Terminated})
            .getCount()
    }

    async existsUsername(username: string, domainId: number): Promise<boolean> {
        return await db.billing.VoipSubscriber.count({
            where: {username, domain_id: domainId, status: Not(VoipSubscriberStatus.Terminated)},
        }) > 0
    }

    async existsWebusername(webusername: string, provisioningDomainId: number, excludeProvisioningId?: number): Promise<boolean> {
        const qb = db.provisioning.VoipSubscriber.createQueryBuilder('prov')
            .where('prov.webusername = :webusername', {webusername})
            .andWhere('prov.domain_id = :domainId', {domainId: provisioningDomainId})
        if (excludeProvisioningId != undefined)
            qb.andWhere('prov.id != :excludeId', {excludeId: excludeProvisioningId})
        return await qb.getCount() > 0
    }

    async extensionInUse(customerId: number, extension: string, excludeId?: number): Promise<boolean> {
        const qb = db.billing.VoipSubscriber.createQueryBuilder('subscriber')
            .innerJoin('subscriber.provisioningVoipSubscriber', 'prov')
            .where('subscriber.contract_id = :customerId', {customerId})
            .andWhere('subscriber.status != :terminated', {terminated: VoipSubscriberStatus.Terminated})
            .andWhere('prov.pbx_extension = :extension', {extension})
        if (excludeId != undefined)
            qb.andWhere('subscriber.id != :excludeId', {excludeId})
        return await qb.getCount() > 0
    }

    /**
     * Existing number rows, locked until the end of the transaction
     */
    async readNumbers(numbers: SubscriberNumber[]): Promise<SubscriberNumberRow[]> {
        if (!numbers.length)
            return []
        const qb = db.billing.VoipNumber.createQueryBuilder('number')
            .where(new Brackets(where => {
                numbers.forEach((number, index) => {
                    where.orWhere(`(number.cc = :cc${index} AND number.ac = :ac${index} AND number.sn = :sn${index})`, {
                        [`cc${index}`]: number.cc,
                        [`ac${index}`]: number.ac ?? '',
                        [`sn${index}`]: number.sn,
                    })
                })
            }))
            .setLock('pessimistic_write')
        const rows = await qb.getMany()
        return rows.map(row => ({id: row.id, cc: row.cc, ac: row.ac, sn: row.sn, subscriberId: row.subscriber_id ?? null}))
    }

    /**
     * Provisioning ids of the subscribers owning dbaliases with the usernames
     */
    async readAliasOwners(usernames: string[]): Promise<Map<string, number[]>> {
        const owners = new Map<string, number[]>()
        if (!usernames.length)
            return owners
        const aliases = await db.provisioning.VoipDBAlias.find({where: {username: In(usernames)}})
        for (const alias of aliases)
            owners.set(alias.username, [...owners.get(alias.username) ?? [], alias.subscriber_id])
        return owners
    }

    /**
     * Non-terminated subscribers of the customer: pbx groups, or subscribers that can be group members
     * (neither group nor pilot)
     */
    async readRefs(ids: number[], customerId: number, groups: boolean): Promise<SubscriberRef[]> {
        if (!ids.length)
            return []
        const qb = db.billing.VoipSubscriber.createQueryBuilder('subscriber')
            .innerJoinAndSelect('subscriber.provisioningVoipSubscriber', 'prov')
            .innerJoinAndSelect('subscriber.domain', 'domain')
            .where('subscriber.id IN (:...ids)', {ids})
            .andWhere('subscriber.contract_id = :customerId', {customerId})
            .andWhere('subscriber.status != :terminated', {terminated: VoipSubscriberStatus.Terminated})
        if (groups)
            qb.andWhere('prov.is_pbx_group = 1')
        else
            qb.andWhere('prov.is_pbx_group = 0 AND prov.is_pbx_pilot = 0')
        const rows = await qb.getMany()
        return rows.map(row => ({
            id: row.id,
            provisioningId: row.provisioningVoipSubscriber.id,
            uri: `sip:${row.username}@${row.domain.domain}`,
        }))
    }

    async readProfileSet(id: number): Promise<{id: number, resellerId: number} | undefined> {
        const set = await db.provisioning.VoipSubscriberProfileSet.findOne({where: {id}})
        return set ? {id: set.id, resellerId: set.reseller_id} : undefined
    }

    async readProfiles(setId: number): Promise<SubscriberProfileRow[]> {
        const profiles = await db.provisioning.VoipSubscriberProfile.find({where: {set_id: setId}, order: {id: 'ASC'}})
        return profiles.map(profile => ({id: profile.id, setId: profile.set_id, setDefault: !!profile.set_default}))
    }

    async readProfileAttributeIds(profileId: number): Promise<number[]> {
        const rows = await db.provisioning.VoipSubscriberProfileAttribute.find({where: {profile_id: profileId}})
        return rows.map(row => row.attribute_id)
    }

    async readPreferences(provisioningId: number, attributes: string[]): Promise<Map<string, string[]>> {
        const values = new Map<string, string[]>()
        if (!attributes.length)
            return values
        const rows = await db.provisioning.VoipUsrPreference.createQueryBuilder('preference')
            .innerJoinAndSelect('preference.voipPreference', 'attribute')
            .where('preference.subscriber_id = :provisioningId', {provisioningId})
            .andWhere('attribute.attribute IN (:...attributes)', {attributes})
            .orderBy('preference.id')
            .getMany()
        for (const row of rows)
            values.set(row.voipPreference.attribute, [...values.get(row.voipPreference.attribute) ?? [], row.value])
        return values
    }

    async readPasswordJournal(provisioningId: number, web: boolean): Promise<string[]> {
        const options = {where: {subscriber_id: provisioningId}, order: {id: 'DESC' as const}}
        const rows: {value: string}[] = web
            ? await db.provisioning.VoipSubscriberWebPasswordJournal.find(options)
            : await db.provisioning.VoipSubscriberPasswordJournal.find(options)
        return rows.map(row => row.value)
    }

    /* Persist */

    async create(plan: SubscriberWritePlan): Promise<number> {
        const s = plan.subscriber
        const now = new Date()
        let contactId: number = null
        if (plan.contact) {
            const contact = await db.billing.Contact.insert({
                reseller_id: plan.resellerId,
                email: plan.contact.email,
                timezone: plan.contact.timezone,
                create_timestamp: now,
                modify_timestamp: now,
            })
            contactId = insertedId(contact)
        }
        const billing = await db.billing.VoipSubscriber.insert({
            contract_id: s.customerId,
            uuid: s.uuid,
            username: s.username,
            domain_id: s.domainId,
            status: s.status,
            external_id: s.externalId ?? null,
            contact_id: contactId,
        })
        const id = insertedId(billing)
        const provisioning = await db.provisioning.VoipSubscriber.insert({
            uuid: s.uuid,
            username: s.username,
            domain_id: plan.provisioningDomainId,
            password: s.password,
            webusername: s.webusername ?? null,
            webpassword: plan.webpasswordHash ?? null,
            admin: !!s.administrative,
            account_id: s.customerId,
            is_pbx_pilot: !!s.isPbxPilot,
            is_pbx_group: !!s.isPbxGroup,
            pbx_extension: s.pbxExtension ?? null,
            pbx_hunt_policy: s.pbxHuntPolicy ?? null,
            pbx_hunt_timeout: s.pbxHuntTimeout ?? null,
            pbx_hunt_cancel_mode: s.pbxHuntCancelMode ?? null,
            profile_set_id: s.profileSetId ?? null,
            profile_id: s.profileId ?? null,
            create_timestamp: () => 'CURRENT_TIMESTAMP',
            password_modify_timestamp: now,
            webpassword_modify_timestamp: now,
        })
        const target: Target = {id, provisioningId: insertedId(provisioning), provisioningDomainId: plan.provisioningDomainId}
        await this.writeNumbers(target, plan)
        await db.kamailio.VoicemailUser.insert({
            customer_id: s.uuid,
            mailbox: plan.voicemail?.mailbox ?? s.uuid,
            password: plan.voicemail?.password ?? '0',
            email: '',
            tz: 'vienna',
        })
        await this.writeDetails(target, plan)
        return id
    }

    async update(plan: SubscriberWritePlan): Promise<void> {
        const s = plan.subscriber
        const now = new Date()
        const target: Target = {id: s.id, provisioningId: s.provisioningId, provisioningDomainId: plan.provisioningDomainId}
        let contactId = s.contactId ?? null
        if (plan.contact === null && contactId != null) {
            await db.billing.VoipSubscriber.update(s.id, {contact_id: null})
            await db.billing.Contact.delete(contactId)
            contactId = null
        } else if (plan.contact) {
            if (contactId != null) {
                await db.billing.Contact.update(contactId, {email: plan.contact.email, timezone: plan.contact.timezone, modify_timestamp: now})
            } else {
                const contact = await db.billing.Contact.insert({
                    reseller_id: plan.resellerId,
                    email: plan.contact.email,
                    timezone: plan.contact.timezone,
                    create_timestamp: now,
                    modify_timestamp: now,
                })
                contactId = insertedId(contact)
            }
        }
        await db.billing.VoipSubscriber.update(s.id, {status: s.status, external_id: s.externalId ?? null, contact_id: contactId})
        await db.provisioning.VoipSubscriber.update(s.provisioningId, {
            webusername: s.webusername ?? null,
            admin: !!s.administrative,
            pbx_extension: s.pbxExtension ?? null,
            pbx_hunt_policy: s.pbxHuntPolicy ?? null,
            pbx_hunt_timeout: s.pbxHuntTimeout ?? null,
            pbx_hunt_cancel_mode: s.pbxHuntCancelMode ?? null,
            profile_set_id: s.profileSetId ?? null,
            profile_id: s.profileId ?? null,
            modify_timestamp: () => 'CURRENT_TIMESTAMP',
            ...s.password !== undefined ? {password: s.password, password_modify_timestamp: now} : {},
            ...plan.webpasswordHash !== undefined ? {webpassword: plan.webpasswordHash, webpassword_modify_timestamp: now} : {},
        })
        if (plan.numbers)
            await this.writeNumbers(target, plan)
        if (plan.removedAttributeIds?.length)
            await this.removeAttributes(target.provisioningId, plan.removedAttributeIds)
        if (plan.voicemail?.mailbox)
            await db.kamailio.VoicemailUser.update({customer_id: s.uuid}, {mailbox: plan.voicemail.mailbox})
        if (plan.forwards)
            await this.rewriteForwards(target.provisioningId, plan.forwards)
        await this.writeDetails(target, plan)
    }

    async setCustomerPreference(customerId: number, attribute: string, value: string): Promise<void> {
        const rows = await db.billing.VoipSubscriber.createQueryBuilder('subscriber')
            .innerJoinAndSelect('subscriber.provisioningVoipSubscriber', 'prov')
            .where('subscriber.contract_id = :customerId', {customerId})
            .andWhere('subscriber.status != :terminated', {terminated: VoipSubscriberStatus.Terminated})
            .getMany()
        for (const row of rows)
            await this.setPreferences(row.provisioningVoipSubscriber.id, {[attribute]: value})
    }

    private async writeDetails(target: Target, plan: SubscriberWritePlan): Promise<void> {
        await this.setPreferences(target.provisioningId, plan.preferences)
        if (plan.groups)
            await this.setMemberships(target, plan.groups, plan.subscriber)
        if (plan.members)
            await this.setMembers(target, plan.members)
        if (plan.passwordJournal)
            await this.writePasswordJournal(target.provisioningId, plan.passwordJournal, false)
        if (plan.webpasswordJournal)
            await this.writePasswordJournal(target.provisioningId, plan.webpasswordJournal, true)
    }

    /**
     * Releases the given-up numbers first, then assigns the primary number and the aliases
     */
    private async writeNumbers(target: Target, plan: SubscriberWritePlan): Promise<void> {
        for (const release of plan.numbers?.released ?? [])
            await this.releaseNumber(target, release, plan.allowCli)
        if (!plan.numbers)
            return
        const primaryId = plan.numbers.primary
            ? await this.assignNumber(target, plan.numbers.primary, plan.resellerId, plan.allowCli)
            : null
        await db.billing.VoipSubscriber.update(target.id, {primary_number_id: primaryId})
        for (const alias of plan.numbers.aliases)
            await this.assignNumber(target, alias, plan.resellerId, plan.allowCli)
    }

    /**
     * Assigns the number row (created if missing), its dbalias and allowed_clis entry to the target
     */
    private async assignNumber(target: Target, assignment: SubscriberNumberAssignment, resellerId: number, allowCli: boolean): Promise<number> {
        const {cc, ac, sn} = assignment.number
        let numberId = assignment.numberId
        if (numberId != undefined) {
            await db.billing.VoipNumber.update(numberId, {subscriber_id: target.id, reseller_id: resellerId, status: VoipNumberStatus.Active})
        } else {
            const inserted = await db.billing.VoipNumber.insert({
                cc, ac: ac ?? '', sn, reseller_id: resellerId, subscriber_id: target.id, status: VoipNumberStatus.Active,
            })
            numberId = insertedId(inserted)
        }
        const username = numberString(assignment.number)
        const aliases = await db.provisioning.VoipDBAlias.find({where: {username}})
        const others = aliases.filter(alias => alias.subscriber_id != target.provisioningId)
        if (others.length)
            await db.provisioning.VoipDBAlias.delete(others.map(alias => alias.id))
        const own = aliases.find(alias => alias.subscriber_id == target.provisioningId)
        const values = {domain_id: target.provisioningDomainId, is_primary: assignment.isPrimary, is_devid: assignment.isDevId}
        if (own)
            await db.provisioning.VoipDBAlias.update(own.id, values)
        else
            await db.provisioning.VoipDBAlias.insert({username, subscriber_id: target.provisioningId, ...values})
        if (assignment.fromProvisioningId != undefined)
            await this.removeAllowedCli(assignment.fromProvisioningId, username)
        if (allowCli)
            await this.addAllowedCli(target.provisioningId, username)
        return numberId
    }

    /**
     * Moves a number of the target back to the pool owner, or unassigns it
     */
    private async releaseNumber(target: Target, release: SubscriberNumberRelease, allowCli: boolean): Promise<void> {
        const username = numberString(release.number)
        await db.provisioning.VoipDBAlias.delete({username, subscriber_id: target.provisioningId})
        await this.removeAllowedCli(target.provisioningId, username)
        if (!release.toOwner) {
            await db.billing.VoipNumber.update(release.numberId, {subscriber_id: null, reseller_id: null})
            return
        }
        const owner = release.toOwner
        await db.billing.VoipNumber.update(release.numberId, {subscriber_id: owner.id})
        const own = await db.provisioning.VoipDBAlias.findOne({where: {username, subscriber_id: owner.provisioningId}})
        const values = {domain_id: owner.provisioningDomainId, is_primary: false, is_devid: false}
        if (own)
            await db.provisioning.VoipDBAlias.update(own.id, values)
        else
            await db.provisioning.VoipDBAlias.insert({username, subscriber_id: owner.provisioningId, ...values})
        if (allowCli)
            await this.addAllowedCli(owner.provisioningId, username)
    }

    private async addAllowedCli(provisioningId: number, value: string): Promise<void> {
        const [attributeId] = await this.attributeIds(['allowed_clis'])
        const exists = await db.provisioning.VoipUsrPreference.count({where: {subscriber_id: provisioningId, attribute_id: attributeId, value}})
        if (!exists)
            await db.provisioning.VoipUsrPreference.insert({subscriber_id: provisioningId, attribute_id: attributeId, value})
    }

    private async removeAllowedCli(provisioningId: number, value: string): Promise<void> {
        const [attributeId] = await this.attributeIds(['allowed_clis'])
        await db.provisioning.VoipUsrPreference.delete({subscriber_id: provisioningId, attribute_id: attributeId, value})
    }

    /**
     * Upserts single value preferences (extra rows removed), null deletes them
     */
    private async setPreferences(provisioningId: number, preferences: Record<string, string | null>): Promise<void> {
        const names = Object.keys(preferences)
        if (!names.length)
            return
        const ids = await this.attributeIds(names)
        const existing = await db.provisioning.VoipUsrPreference.find({
            where: {subscriber_id: provisioningId, attribute_id: In(ids)},
            order: {id: 'ASC'},
        })
        const deleted: number[] = []
        const inserted: {subscriber_id: number, attribute_id: number, value: string}[] = []
        for (const [index, name] of names.entries()) {
            const value = preferences[name]
            const rows = existing.filter(row => row.attribute_id == ids[index])
            if (value === null || value === undefined) {
                deleted.push(...rows.map(row => row.id))
                continue
            }
            if (!rows.length) {
                inserted.push({subscriber_id: provisioningId, attribute_id: ids[index], value})
                continue
            }
            if (rows[0].value !== value)
                await db.provisioning.VoipUsrPreference.update(rows[0].id, {value})
            deleted.push(...rows.slice(1).map(row => row.id))
        }
        if (deleted.length)
            await db.provisioning.VoipUsrPreference.delete(deleted)
        if (inserted.length)
            await db.provisioning.VoipUsrPreference.insert(inserted)
    }

    /**
     * Replaces the groups of a member; the groups' hunt group lists follow
     */
    private async setMemberships(target: Target, groups: SubscriberRef[], subscriber: internal.Subscriber): Promise<void> {
        const uri = `sip:${subscriber.username}@${subscriber.domain}`
        const [huntGroupId] = await this.attributeIds(['cloud_pbx_hunt_group'])
        const existing = await db.provisioning.VoipPbxGroup.find({where: {subscriber_id: target.provisioningId}})
        const desired = groups.map(group => group.provisioningId)
        const removed = existing.filter(membership => !desired.includes(membership.group_id))
        if (removed.length) {
            await db.provisioning.VoipPbxGroup.delete(removed.map(membership => membership.id))
            await db.provisioning.VoipUsrPreference.delete({
                subscriber_id: In(removed.map(membership => membership.group_id)),
                attribute_id: huntGroupId,
                value: uri,
            })
        }
        const added = desired.filter(groupId => !existing.some(membership => membership.group_id == groupId))
        for (const groupId of added) {
            await db.provisioning.VoipPbxGroup.insert({group_id: groupId, subscriber_id: target.provisioningId})
            await db.provisioning.VoipUsrPreference.insert({subscriber_id: groupId, attribute_id: huntGroupId, value: uri})
        }
    }

    /**
     * Replaces the members of a group and its hunt group list, in the given order
     */
    private async setMembers(target: Target, members: SubscriberRef[]): Promise<void> {
        const [huntGroupId] = await this.attributeIds(['cloud_pbx_hunt_group'])
        const existing = await db.provisioning.VoipPbxGroup.find({where: {group_id: target.provisioningId}, order: {id: 'ASC'}})
        const unchanged = existing.length == members.length
            && existing.every((membership, index) => membership.subscriber_id == members[index].provisioningId)
        if (unchanged)
            return
        await db.provisioning.VoipPbxGroup.delete({group_id: target.provisioningId})
        await db.provisioning.VoipUsrPreference.delete({subscriber_id: target.provisioningId, attribute_id: huntGroupId})
        for (const member of members) {
            await db.provisioning.VoipPbxGroup.insert({group_id: target.provisioningId, subscriber_id: member.provisioningId})
            await db.provisioning.VoipUsrPreference.insert({subscriber_id: target.provisioningId, attribute_id: huntGroupId, value: member.uri})
        }
    }

    private async writePasswordJournal(provisioningId: number, entry: SubscriberPasswordJournalEntry, web: boolean): Promise<void> {
        const row = {subscriber_id: provisioningId, value: entry.hash}
        const options = {where: {subscriber_id: provisioningId}, order: {id: 'DESC' as const}}
        if (web) {
            await db.provisioning.VoipSubscriberWebPasswordJournal.insert(row)
            const outdated = (await db.provisioning.VoipSubscriberWebPasswordJournal.find(options)).slice(entry.keep)
            if (outdated.length)
                await db.provisioning.VoipSubscriberWebPasswordJournal.delete(outdated.map(journal => journal.id))
        } else {
            await db.provisioning.VoipSubscriberPasswordJournal.insert(row)
            const outdated = (await db.provisioning.VoipSubscriberPasswordJournal.find(options)).slice(entry.keep)
            if (outdated.length)
                await db.provisioning.VoipSubscriberPasswordJournal.delete(outdated.map(journal => journal.id))
        }
    }

    /**
     * Deletes usr preferences of the attributes, and call forwards whose type is one of them
     */
    private async removeAttributes(provisioningId: number, attributeIds: number[]): Promise<void> {
        await db.provisioning.VoipUsrPreference.delete({subscriber_id: provisioningId, attribute_id: In(attributeIds)})
        const attributes = await db.provisioning.VoipPreference.find({where: {id: In(attributeIds)}})
        const types = attributes.map(attribute => attribute.attribute).filter(name => callForwardTypes.includes(name))
        if (types.length)
            await db.provisioning.VoipCfMapping.delete({subscriber_id: provisioningId, type: In(types)})
    }

    /**
     * Voicebox, fax2mail and conference destinations follow the primary number; without a primary number the
     * fax2mail and conference destinations are removed with the destination sets they leave empty
     */
    private async rewriteForwards(provisioningId: number, forwards: {number: string, primaryRemoved: boolean}): Promise<void> {
        const sets = await db.provisioning.VoipCfDestinationSet.find({where: {subscriber_id: provisioningId}})
        if (!sets.length)
            return
        const destinations = await db.provisioning.VoipCfDestination.find({where: {destination_set_id: In(sets.map(set => set.id))}})
        const removed: number[] = []
        for (const destination of destinations) {
            const voicebox = /^sip:(vm[ub]).+@voicebox\.local$/.exec(destination.destination)
            let value: string | null | undefined
            if (voicebox)
                value = `sip:${voicebox[1]}${forwards.number}@voicebox.local`
            else if (/@fax2mail\.local$/.test(destination.destination))
                value = forwards.primaryRemoved ? null : `sip:fax=${forwards.number}@fax2mail.local`
            else if (/@conference\.local$/.test(destination.destination))
                value = forwards.primaryRemoved ? null : `sip:conf=${forwards.number}@conference.local`
            if (value === null)
                removed.push(destination.id)
            else if (value !== undefined && value != destination.destination)
                await db.provisioning.VoipCfDestination.update(destination.id, {destination: value})
        }
        if (!removed.length)
            return
        await db.provisioning.VoipCfDestination.delete(removed)
        const emptied = sets.filter(set => destinations.every(d => d.destination_set_id != set.id || removed.includes(d.id)))
        if (emptied.length) {
            await db.provisioning.VoipCfMapping.delete({destination_set_id: In(emptied.map(set => set.id))})
            await db.provisioning.VoipCfDestinationSet.delete(emptied.map(set => set.id))
        }
    }

    private async attributeIds(names: string[]): Promise<number[]> {
        const missing = names.filter(name => !this.attributeIdCache.has(name))
        if (missing.length) {
            const rows = await db.provisioning.VoipPreference.find({where: {attribute: In(missing)}})
            for (const row of rows)
                this.attributeIdCache.set(row.attribute, row.id)
        }
        return names.map(name => {
            const id = this.attributeIdCache.get(name)
            if (id == undefined)
                throw new Error(`unknown usr preference ${name}`)
            return id
        })
    }
}
