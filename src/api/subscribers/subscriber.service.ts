import {randomInt, randomUUID} from 'crypto'

import {ForbiddenException, HttpStatus, Inject, Injectable, NotFoundException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {
    SubscriberCustomer,
    SubscriberDomain,
    SubscriberNumberAssignment,
    SubscriberNumberRelease,
    SubscriberRef,
    SubscriberScope,
    SubscriberWritePlan,
} from './interfaces/subscriber.repository'
import {SubscriberMariadbRepository} from './repositories/subscriber.mariadb.repository'
import {
    SubscriberField,
    changedFields,
    derivePrimary,
    duplicateAlias,
    extInRange,
    immutableFields,
    limitReached,
    lockLevel,
    numberString,
    poolDiff,
    readOnlyFields,
    renumber,
    sameAliases,
    sameNumber,
    sameValue,
} from './subscriber.rules'

import {AppService} from '~/app.service'
import {License as LicenseType, RbacRole} from '~/config/constants.config'
import {internal} from '~/entities'
import {ProductClass} from '~/entities/internal/product.internal.entity'
import {SubscriberNumber} from '~/entities/internal/subscriber.internal.entity'
import {VoipSubscriberStatus} from '~/entities/internal/voip-subscriber.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ApiErrorException, ApiErrors, apiError, itemPointer, throwMissingIds} from '~/helpers/errors.helper'
import {generatePassword, isPasswordInJournal, passwordJournalHash, saltedPassword} from '~/helpers/password.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ErrorMessage} from '~/interfaces/error-message.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LicenseCounter, LicenseService} from '~/license/license.service'
import {LoggerService} from '~/logger/logger.service'

interface WriteContext {
    customers: Map<number, SubscriberCustomer>
    caller?: internal.Subscriber
    pbxActive?: boolean
    /** platform counters of the subscribers created by this request */
    added: Record<LicenseCounter, number>
    allowCli: boolean
}

type Pointer = (...path: (string | number)[]) => string

const pbxFields: SubscriberField[] = [
    'isPbxPilot',
    'isPbxGroup',
    'pbxExtension',
    'pbxHuntPolicy',
    'pbxHuntTimeout',
    'pbxHuntCancelMode',
    'pbxGroupIds',
    'pbxGroupmemberIds',
]
const huntFields: SubscriberField[] = [
    'pbxHuntPolicy',
    'pbxHuntTimeout',
    'pbxHuntCancelMode',
]
const subscriberRoles: string[] = [
    RbacRole.subscriberadmin,
    RbacRole.subscriber,
]

@Injectable()
export class SubscriberService implements CrudService<internal.Subscriber> {
    private readonly log = new LoggerService(SubscriberService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(SubscriberMariadbRepository) private readonly subscriberRepo: SubscriberMariadbRepository,
        @Inject(AppService) private readonly app: AppService,
        @Inject(LicenseService) private readonly license: LicenseService,
    ) {
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Subscriber[], number]> {
        return await this.subscriberRepo.readAll(sr, this.roleScope(sr))
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Subscriber> {
        const subscriber = await this.subscriberRepo.readById(id, this.roleScope(sr))
        if (!subscriber)
            throw new NotFoundException(this.i18n.t('errors.SUBSCRIBER_NOT_FOUND'))
        return subscriber
    }

    /**
     * Creates the subscribers in request order, so later items may refer to earlier ones (pilot, groups)
     */
    async create(subscribers: internal.Subscriber[], sr: ServiceRequest): Promise<internal.Subscriber[]> {
        const scope = this.roleScope(sr)
        if (sr.user.role == RbacRole.subscriber)
            throw new ForbiddenException(this.i18n.t('errors.PERMISSION_DENIED'))
        const createPrimaryAcli = SearchLogic.parseBoolean(sr, 'create_primary_acli') ?? true
        const errors = new ApiErrors()
        for (const [index, subscriber] of subscribers.entries()) {
            if (sr.user.role == RbacRole.subscriberadmin) {
                subscriber.customerId ??= sr.user.customer_id
                if (subscriber.customerId != sr.user.customer_id)
                    errors.add(this.i18n.t('errors.SUBSCRIBER_CUSTOMER_INVALID'), itemPointer(sr, index, subscriber, 'customerId'))
            } else if (subscriber.customerId == undefined) {
                errors.add(this.i18n.t('errors.SUBSCRIBER_CUSTOMER_REQUIRED'), itemPointer(sr, index, subscriber, 'customerId'))
            }
        }
        errors.throwIfAny()
        const ctx = await this.lockAndReadCustomers(subscribers.map(s => s.customerId), scope, sr, createPrimaryAcli)
        const ids: number[] = []
        await this.writeInRequestOrder(subscribers, async (subscriber, key) => {
            ids.push(await this.createSubscriber(subscriber, key, ctx, sr))
        })
        const created = await this.subscriberRepo.readWhereInIds(ids, {})
        return ids.map(id => created.find(subscriber => subscriber.id == id))
    }

    /**
     * Updates the subscribers (PUT and PATCH); omitted writable fields are reset, omitted read-only ones kept
     * @param updates subscribers by id, undefined fields were omitted
     */
    async update(updates: Dictionary<internal.Subscriber>, sr: ServiceRequest): Promise<number[]> {
        const scope = this.roleScope(sr)
        const createPrimaryAcli = SearchLogic.parseBoolean(sr, 'create_primary_acli') ?? true
        const ids = Object.keys(updates).map(id => +id)
        const found = await this.subscriberRepo.readWhereInIds(ids, scope)
        throwMissingIds(sr, ids, found.map(s => s.id), this.i18n.t('errors.SUBSCRIBER_NOT_FOUND'))
        const ctx = await this.lockAndReadCustomers(found.map(s => s.customerId), {}, sr, createPrimaryAcli)
        await this.writeInRequestOrder(updates, async (subscriber, key) => {
            const old = await this.subscriberRepo.readById(+key, scope)
            await this.updateSubscriber(subscriber, old, key, ctx, sr)
        })
        return ids
    }

    private roleScope(sr: ServiceRequest): SubscriberScope {
        switch (sr.user.role) {
            case RbacRole.system:
            case RbacRole.admin:
            case RbacRole.ccareadmin:
                return {}
            case RbacRole.reseller:
            case RbacRole.ccare:
                return {resellerId: sr.user.reseller_id}
            case RbacRole.subscriberadmin:
                return {customerId: sr.user.customer_id}
            case RbacRole.subscriber:
                return {subscriberId: sr.user.id}
        }
        throw new ForbiddenException(this.i18n.t('errors.PERMISSION_DENIED'))
    }

    /**
     * Locks the customers' and their resellers' contracts, then reads the customers
     */
    private async lockAndReadCustomers(customerIds: number[], scope: SubscriberScope, sr: ServiceRequest, createPrimaryAcli: boolean): Promise<WriteContext> {
        const ids = [...new Set(customerIds)]
        const unlocked = await this.subscriberRepo.readCustomers(ids, scope.resellerId)
        await this.subscriberRepo.lockContracts([...unlocked.map(c => c.resellerContractId), ...unlocked.map(c => c.id)])
        const customers = await this.subscriberRepo.readCustomers(ids, scope.resellerId)
        const caller = subscriberRoles.includes(sr.user.role) ? await this.subscriberRepo.readById(sr.user.id, {}) : undefined
        return {
            customers: new Map(customers.map(c => [c.id, c])),
            caller,
            added: {subscribers: 0, pbx_subscribers: 0, pbx_groups: 0},
            allowCli: this.app.config.numbermanagement.auto_allow_cli && createPrimaryAcli,
        }
    }

    /**
     * Writes the items one after the other in request order. API errors of all failing items are reported together
     * (the transaction is rolled back), other errors are rethrown.
     */
    private async writeInRequestOrder<T>(items: T[] | Record<string, T>, write: (item: T, key: number | string) => Promise<void>): Promise<void> {
        const entries: [number | string, T][] = Array.isArray(items)
            ? items.map((item, index): [number, T] => [index, item])
            : Object.entries(items)
        const failed: ApiErrorException[] = []
        for (const [key, item] of entries) {
            try {
                await write(item, key)
            } catch (err) {
                if (!(err instanceof ApiErrorException))
                    throw err
                failed.push(err)
            }
        }
        if (failed.length)
            throw new ApiErrorException(failed.flatMap(err => err.errorList), failed[0].getStatus())
    }

    /* Create */

    private async createSubscriber(s: internal.Subscriber, key: number | string, ctx: WriteContext, sr: ServiceRequest): Promise<number> {
        const at: Pointer = (...path) => itemPointer(sr, key, s, ...path)
        const customer = ctx.customers.get(s.customerId)
        if (!customer)
            throw apiError(this.i18n.t('errors.SUBSCRIBER_CUSTOMER_INVALID'), at('customerId'))
        await this.checkWriteAccess(customer, ctx, sr, at())
        const pbx = customer.productClass == ProductClass.PbxAccount
        const pilot = pbx ? await this.subscriberRepo.readPilot(customer.id) : undefined
        const subscriberadmin = sr.user.role == RbacRole.subscriberadmin
        const poolOwner = subscriberadmin ? pbx ? pilot : ctx.caller : undefined
        const domain = await this.resolveDomain(s, customer, sr, ctx, pilot, at)
        const errors = new ApiErrors()

        await this.checkSubscriberLimits(s, customer, ctx, at)
        s.uuid = randomUUID()
        s.domain = domain.domain
        s.domainId = domain.id
        s.status ??= VoipSubscriberStatus.Active
        s.lock = lockLevel(s.status, s.lock)
        if (subscriberadmin)
            await this.checkSubscriberadminCreateFields(s, pilot, at, errors)
        else
            await this.resolveProfile(s, undefined, customer, at, errors)
        s.administrative = !!s.administrative
        s.externalId ??= null
        s.isPbxPilot = !!s.isPbxPilot
        s.isPbxGroup = !!s.isPbxGroup

        if (await this.subscriberRepo.existsUsername(s.username, domain.id))
            errors.add(this.i18n.t('errors.SUBSCRIBER_EXISTS', {args: {username: s.username}}), at('username'))
        if (s.webusername && await this.subscriberRepo.existsWebusername(s.webusername, domain.provisioningId))
            errors.add(this.i18n.t('errors.SUBSCRIBER_WEBUSERNAME_EXISTS', {args: {webusername: s.webusername}}), at('webusername'))
        const refs = await this.checkPbxFields(s, undefined, customer, pilot, at, errors)
        const numbers = await this.planNumberChanges(s, undefined, customer, pilot, poolOwner, at, errors)
        const plan: SubscriberWritePlan = {
            subscriber: s,
            resellerId: customer.resellerId,
            provisioningDomainId: domain.provisioningId,
            allowCli: ctx.allowCli,
            numbers,
            preferences: {},
            ...refs,
        }
        await this.preparePasswords(s, undefined, plan, at, errors)
        errors.throwIfAny()

        if (s.email != null || s.timezone != null)
            plan.contact = {email: s.email ?? null, timezone: s.timezone ?? null}
        plan.voicemail = {
            mailbox: s.primaryNumber ? numberString(s.primaryNumber) : s.uuid,
            password: `${randomInt(10000)}`.padStart(4, '0'),
        }
        plan.preferences = {
            account_id: `${customer.id}`,
            reseller_id: `${customer.resellerId}`,
            ...customer.soundSetId != null ? {contract_sound_set: `${customer.soundSetId}`} : {},
            ...customer.externalId ? {ext_contract_id: customer.externalId} : {},
            ...s.primaryNumber ? this.primaryNumberPreferences(s.primaryNumber) : {},
            ...s.primaryNumber && this.app.config.numbermanagement.auto_sync_cli ? {cli: numberString(s.primaryNumber)} : {},
            ...this.buildSubscriberPreferences(s, pbx, pilot),
        }
        const id = await this.subscriberRepo.create(plan)
        ctx.added.subscribers++
        if (pbx)
            ctx.added.pbx_subscribers++
        if (s.isPbxGroup)
            ctx.added.pbx_groups++
        return id
    }

    /**
     * Domain of a new subscriber: domain or domain_id for admin roles; a subscriberadmin's subscribers get the
     * pilot's domain (PBX) or its own unless given (non-PBX). It must belong to the customer's reseller.
     */
    private async resolveDomain(s: internal.Subscriber, customer: SubscriberCustomer, sr: ServiceRequest, ctx: WriteContext, pilot: internal.Subscriber | undefined, at: Pointer): Promise<SubscriberDomain> {
        const pointer = s.domainId != undefined ? at('domainId') : at('domain')
        let ref = s.domainId != undefined ? {id: s.domainId} : s.domain ? {name: s.domain} : undefined
        if (sr.user.role == RbacRole.subscriberadmin) {
            const own = pilot ?? ctx.caller
            if (ref && customer.productClass == ProductClass.PbxAccount
                && (ref.id != undefined ? ref.id != own.domainId : ref.name != own.domain))
                throw apiError(this.i18n.t('errors.SUBSCRIBER_DOMAIN_INVALID'), pointer)
            ref ??= {id: own.domainId}
        }
        if (!ref)
            throw apiError(this.i18n.t('errors.SUBSCRIBER_DOMAIN_REQUIRED'), at('domain'))
        const domain = await this.subscriberRepo.readDomain(ref)
        if (!domain || domain.resellerId != customer.resellerId || (s.domain && s.domainId != undefined && s.domain != domain.domain))
            throw apiError(this.i18n.t('errors.SUBSCRIBER_DOMAIN_INVALID'), pointer)
        return domain
    }

    /**
     * Fields a subscriberadmin can't set on its new subscribers: they must be empty or equal to the resolved values
     * (not administrative, no external id, the pilot's profile set with its default profile)
     */
    private async checkSubscriberadminCreateFields(s: internal.Subscriber, pilot: internal.Subscriber | undefined, at: Pointer, errors: ApiErrors): Promise<void> {
        let profileSetId: number | null = null
        let profileId: number | null = null
        if (pilot?.profileSetId) {
            profileSetId = pilot.profileSetId
            profileId = (await this.subscriberRepo.readProfiles(profileSetId)).find(p => p.setDefault)?.id ?? null
            if (profileId == null)
                errors.add(this.i18n.t('errors.SUBSCRIBER_PROFILE_UNDETERMINED'), at('profileId'))
        }
        const readOnly: ErrorMessage = this.i18n.t('errors.SUBSCRIBER_FIELD_READ_ONLY')
        if (s.administrative)
            errors.add(readOnly, at('administrative'))
        if (s.externalId != null)
            errors.add(readOnly, at('externalId'))
        if (s.profileSetId != null && s.profileSetId != profileSetId)
            errors.add(readOnly, at('profileSetId'))
        if (s.profileId != null && s.profileId != profileId)
            errors.add(readOnly, at('profileId'))
        s.administrative = false
        s.externalId = null
        s.profileSetId = profileSetId
        s.profileId = profileId
    }

    private async checkSubscriberLimits(s: internal.Subscriber, customer: SubscriberCustomer, ctx: WriteContext, at: Pointer): Promise<void> {
        const counters: [LicenseCounter, string][] = [['subscribers', 'subscribers for this platform']]
        if (customer.productClass == ProductClass.PbxAccount)
            counters.push(['pbx_subscribers', 'PBX subscribers for this platform'])
        if (customer.productClass == ProductClass.PbxAccount && s.isPbxGroup)
            counters.push(['pbx_groups', 'PBX groups for this platform'])
        for (const [counter, name] of counters) {
            const limit = await this.license.readLimit(counter)
            if (limit.current >= 0 && limitReached(limit.max, limit.current + ctx.added[counter]))
                throw apiError(this.i18n.t('errors.SUBSCRIBER_LIMIT_REACHED', {args: {limit: name}}), at())
        }
        if (limitReached(customer.maxSubscribers, await this.subscriberRepo.countActive(customer.id)))
            throw apiError(this.i18n.t('errors.SUBSCRIBER_LIMIT_REACHED', {args: {limit: 'customer subscribers'}}), at())
        if (limitReached(customer.resellerMaxSubscribers, await this.subscriberRepo.countActiveByReseller(customer.resellerId)))
            throw apiError(this.i18n.t('errors.SUBSCRIBER_LIMIT_REACHED', {args: {limit: 'reseller subscribers'}}), at())
    }

    /* Update */

    private async updateSubscriber(s: internal.Subscriber, old: internal.Subscriber, key: number | string, ctx: WriteContext, sr: ServiceRequest): Promise<void> {
        const at: Pointer = (...path) => itemPointer(sr, key, s, ...path)
        const customer = ctx.customers.get(old.customerId)
        if (!customer)
            throw apiError(this.i18n.t('errors.SUBSCRIBER_CUSTOMER_INVALID'), at('customerId'))
        await this.checkWriteAccess(customer, ctx, sr, at(), old)

        const errors = new ApiErrors()
        for (const field of immutableFields) {
            if (s[field] !== undefined && !sameValue(field, old, s))
                errors.add(this.i18n.t('errors.SUBSCRIBER_FIELD_IMMUTABLE'), at(field))
        }
        const readOnly = readOnlyFields(sr.user.role, sr.user.id, old)
        for (const field of changedFields(old, s, readOnly))
            errors.add(this.i18n.t('errors.SUBSCRIBER_FIELD_READ_ONLY'), at(field))
        errors.throwIfAny()

        // a PATCH carries the stored lock: only a different one counts as given
        const lockGiven = s.lock !== undefined && !sameValue('lock', old, s)
        for (const field of [...immutableFields, ...readOnly]) {
            if (s[field] === undefined)
                Object.assign(s, {[field]: old[field]})
        }
        Object.assign(s, {
            id: old.id,
            provisioningId: old.provisioningId,
            provisioningDomainId: old.provisioningDomainId,
            uuid: old.uuid,
            customerId: old.customerId,
            customerProductClass: old.customerProductClass,
            resellerId: old.resellerId,
            contactId: old.contactId,
            username: old.username,
            domain: old.domain,
            domainId: old.domainId,
            isPbxPilot: old.isPbxPilot,
            isPbxGroup: old.isPbxGroup,
        })
        s.status ??= VoipSubscriberStatus.Active
        s.lock = readOnly.includes('lock') ? old.lock : lockLevel(s.status, lockGiven ? s.lock : undefined, old)
        s.externalId ??= null
        s.email ??= null
        s.timezone ??= null
        s.webusername ??= null
        s.administrative = !!s.administrative
        s.profileSetId ??= null
        s.profileId ??= null
        s.primaryNumber ??= null
        s.aliasNumbers ??= []
        s.displayName ??= null
        s.pbxExtension ??= null
        s.pbxHuntPolicy ??= null
        s.pbxHuntTimeout ??= null
        s.pbxHuntCancelMode ??= null
        s.pbxGroupIds ??= []
        s.pbxGroupmemberIds ??= []

        const pbx = customer.productClass == ProductClass.PbxAccount
        const pilot = pbx ? old.isPbxPilot ? old : await this.subscriberRepo.readPilot(customer.id) : undefined
        const poolOwner = sr.user.role == RbacRole.subscriberadmin ? pbx ? pilot : ctx.caller : undefined
        if (s.webusername && s.webusername != old.webusername
            && await this.subscriberRepo.existsWebusername(s.webusername, old.provisioningDomainId, old.provisioningId))
            errors.add(this.i18n.t('errors.SUBSCRIBER_WEBUSERNAME_EXISTS', {args: {webusername: s.webusername}}), at('webusername'))
        const refs = await this.checkPbxFields(s, old, customer, pilot, at, errors)
        if (!subscriberRoles.includes(sr.user.role))
            await this.resolveProfile(s, old, customer, at, errors)
        const numbers = await this.planNumberChanges(s, old, customer, pilot, poolOwner, at, errors)
        const plan: SubscriberWritePlan = {
            subscriber: s,
            resellerId: customer.resellerId,
            provisioningDomainId: old.provisioningDomainId,
            allowCli: ctx.allowCli,
            numbers,
            preferences: {},
            ...refs,
        }
        await this.preparePasswords(s, old, plan, at, errors)
        errors.throwIfAny()

        if (s.email == null && s.timezone == null) {
            if (old.contactId != null)
                plan.contact = null
        } else if (s.email != old.email || s.timezone != old.timezone) {
            plan.contact = {email: s.email, timezone: s.timezone}
        }
        if (old.profileId && s.profileId != old.profileId) {
            const allowed = s.profileId ? new Set(await this.subscriberRepo.readProfileAttributeIds(s.profileId)) : undefined
            if (allowed)
                plan.removedAttributeIds = (await this.subscriberRepo.readProfileAttributeIds(old.profileId)).filter(id => !allowed.has(id))
        }
        const primaryChanged = !sameNumber(old.primaryNumber, s.primaryNumber)
        let followUps: Partial<SubscriberWritePlan> = {}
        if (primaryChanged)
            followUps = await this.primaryNumberChangeEffects(s, old.primaryNumber, s.primaryNumber)
        plan.preferences = {
            ...followUps.preferences,
            ...this.buildSubscriberPreferences(s, pbx, pilot),
        }
        plan.voicemail = followUps.voicemail
        plan.forwards = followUps.forwards
        await this.subscriberRepo.update(plan)

        if (pbx && old.isPbxPilot && primaryChanged && old.primaryNumber && s.primaryNumber)
            await this.renumberPbxSubscribers(s, old.primaryNumber, customer, at)
    }

    /**
     * Seats and groups whose numbers start with the pilot's old number follow its new number; the PBX base CLI
     * of all subscribers of the customer becomes the new pilot number
     */
    private async renumberPbxSubscribers(pilot: internal.Subscriber, oldPrimary: SubscriberNumber, customer: SubscriberCustomer, at: Pointer): Promise<void> {
        const subscribers = await this.subscriberRepo.readByCustomer(customer.id)
        for (const seat of subscribers) {
            if (seat.id == pilot.id || !seat.primaryNumber)
                continue
            const number = renumber(oldPrimary, pilot.primaryNumber, seat.primaryNumber)
            if (!number || sameNumber(number, seat.primaryNumber))
                continue
            const [row] = await this.subscriberRepo.readNumbers([number])
            if (row?.subscriberId != null && row.subscriberId != seat.id)
                throw apiError(this.i18n.t('errors.SUBSCRIBER_NUMBER_IN_USE', {args: {number: numberString(number)}}), at('primaryNumber'))
            const followUps = await this.primaryNumberChangeEffects(seat, seat.primaryNumber, number)
            const previous = seat.primaryNumber
            seat.primaryNumber = number
            await this.subscriberRepo.update({
                subscriber: seat,
                resellerId: customer.resellerId,
                provisioningDomainId: seat.provisioningDomainId,
                allowCli: this.app.config.numbermanagement.auto_allow_cli,
                numbers: {
                    primary: {number, numberId: row?.id, isPrimary: true, isDevId: false},
                    aliases: [],
                    released: [{numberId: previous.numberId, number: previous}],
                },
                preferences: followUps.preferences,
                voicemail: followUps.voicemail,
                forwards: followUps.forwards,
            })
        }
        await this.subscriberRepo.setCustomerPreference(customer.id, 'cloud_pbx_base_cli', numberString(pilot.primaryNumber))
    }

    /* Shared steps */

    /**
     * PBX customers need the pbx license and cloud PBX; a subscriberadmin writes others of a non-PBX customer only
     * with the subscribers write privilege
     */
    private async checkWriteAccess(customer: SubscriberCustomer, ctx: WriteContext, sr: ServiceRequest, pointer: string, target?: internal.Subscriber): Promise<void> {
        if (customer.productClass == ProductClass.PbxAccount) {
            ctx.pbxActive ??= this.app.config.features.cloudpbx && await this.license.areLicensesActive([LicenseType.pbx])
            if (!ctx.pbxActive)
                throw apiError(this.i18n.t('errors.LICENSE_PBX_INACTIVE'), pointer, HttpStatus.FORBIDDEN)
            return
        }
        if (sr.user.role == RbacRole.subscriberadmin && target?.id != sr.user.id
            && !this.app.config.privileges.subscriberadmin.subscribers.includes('write'))
            throw apiError(this.i18n.t('errors.SUBSCRIBER_READ_ONLY'), pointer, HttpStatus.FORBIDDEN)
    }

    /**
     * PBX rules: pilot, extension (required, unique, in range), group and member ids; PBX fields of other kinds of
     * subscribers are rejected
     * @returns the groups (members) or members (groups) to write, if they change
     */
    private async checkPbxFields(s: internal.Subscriber, old: internal.Subscriber | undefined, customer: SubscriberCustomer, pilot: internal.Subscriber | undefined, at: Pointer, errors: ApiErrors): Promise<Pick<SubscriberWritePlan, 'groups' | 'members'>> {
        const invalid: ErrorMessage = this.i18n.t('errors.SUBSCRIBER_PBX_FIELD_INVALID')
        // set to a value, other than the stored one on update (stored defaults such as a seat's hunt cancel mode pass)
        const isSet = (field: SubscriberField): boolean => {
            const value = s[field]
            const set = Array.isArray(value) ? value.length > 0 : value != null && value !== '' && value !== false
            return set && (!old || !sameValue(field, old, s))
        }
        if (customer.productClass != ProductClass.PbxAccount) {
            for (const field of pbxFields.filter(isSet))
                errors.add(invalid, at(field))
            return {}
        }
        const isPilot = !!s.isPbxPilot
        const isGroup = !!s.isPbxGroup
        if (!old) {
            if (pilot && isPilot)
                errors.add(this.i18n.t('errors.SUBSCRIBER_PBX_PILOT_EXISTS'), at('isPbxPilot'))
            if (!pilot && !isPilot)
                errors.add(this.i18n.t('errors.SUBSCRIBER_PBX_PILOT_MISSING'), at('isPbxPilot'))
            if (isPilot && isGroup)
                errors.add(invalid, at('isPbxGroup'))
        }
        if (!isGroup) {
            for (const field of [...huntFields, 'pbxGroupmemberIds' as SubscriberField].filter(isSet))
                errors.add(invalid, at(field))
        }
        if ((isGroup || isPilot) && isSet('pbxGroupIds'))
            errors.add(invalid, at('pbxGroupIds'))
        const extensionChanged = !old || (s.pbxExtension ?? '') != (old.pbxExtension ?? '')
        if (!isPilot) {
            if (!s.pbxExtension)
                errors.add(this.i18n.t('errors.SUBSCRIBER_PBX_EXTENSION_REQUIRED'), at('pbxExtension'))
            else if (extensionChanged && await this.subscriberRepo.extensionInUse(customer.id, s.pbxExtension, old?.id))
                errors.add(this.i18n.t('errors.SUBSCRIBER_PBX_EXTENSION_EXISTS', {args: {extension: s.pbxExtension}}), at('pbxExtension'))
            if (pilot && !pilot.primaryNumber)
                errors.add(this.i18n.t('errors.SUBSCRIBER_PBX_PILOT_NO_NUMBER'), at('primaryNumber'))
        }
        if (extensionChanged && !extInRange(s.pbxExtension, customer.extRangeMin, customer.extRangeMax))
            errors.add(this.i18n.t('errors.SUBSCRIBER_PBX_EXTENSION_RANGE'), at('pbxExtension'))

        const result: Pick<SubscriberWritePlan, 'groups' | 'members'> = {}
        if (!isGroup && !isPilot && (old ? !sameValue('pbxGroupIds', old, s) : isSet('pbxGroupIds'))) {
            const refs = await this.readPbxRefs(s.pbxGroupIds, customer, true, at, 'pbxGroupIds', 'errors.SUBSCRIBER_PBX_GROUP_INVALID', errors)
            result.groups = refs
        }
        if (isGroup && (old ? !sameValue('pbxGroupmemberIds', old, s) : isSet('pbxGroupmemberIds'))) {
            const refs = await this.readPbxRefs(s.pbxGroupmemberIds, customer, false, at, 'pbxGroupmemberIds', 'errors.SUBSCRIBER_PBX_MEMBER_INVALID', errors)
            result.members = refs
        }
        return result
    }

    /**
     * Groups or members by billing id in request order (duplicates dropped), unknown ids reported
     */
    private async readPbxRefs(ids: number[], customer: SubscriberCustomer, groups: boolean, at: Pointer, field: SubscriberField, errorKey: string, errors: ApiErrors): Promise<SubscriberRef[]> {
        const unique = [...new Set(ids)]
        const refs = await this.subscriberRepo.readRefs(unique, customer.id, groups)
        ids.forEach((id, index) => {
            if (!refs.some(ref => ref.id == id))
                errors.add(this.i18n.t(errorKey, {args: {id}}), at(field, index))
        })
        return unique.map(id => refs.find(ref => ref.id == id)).filter(ref => ref != undefined)
    }

    /**
     * Numbers to assign and release. A PBX subscriber's primary number is derived from the pilot's; a
     * subscriberadmin takes numbers from the pool (PBX: the pilot's aliases, else its own) and gives them back.
     * @returns undefined when the numbers don't change
     */
    private async planNumberChanges(s: internal.Subscriber, old: internal.Subscriber | undefined, customer: SubscriberCustomer, pilot: internal.Subscriber | undefined, poolOwner: internal.Subscriber | undefined, at: Pointer, errors: ApiErrors): Promise<SubscriberWritePlan['numbers']> {
        const pbx = customer.productClass == ProductClass.PbxAccount
        if (pbx && !s.isPbxPilot && pilot?.primaryNumber && s.pbxExtension) {
            const derived = derivePrimary(pilot.primaryNumber, s.pbxExtension)
            if (s.primaryNumber && !sameNumber(s.primaryNumber, derived) && !sameNumber(s.primaryNumber, old?.primaryNumber))
                errors.add(this.i18n.t('errors.SUBSCRIBER_PRIMARY_NUMBER_DERIVED', {args: {number: numberString(derived)}}), at('primaryNumber'))
            s.primaryNumber = derived
        }
        if (!s.primaryNumber && (!pbx || s.isPbxPilot))
            errors.add(this.i18n.t('errors.SUBSCRIBER_PRIMARY_NUMBER_REQUIRED'), at('primaryNumber'))
        const primary = s.primaryNumber ?? null
        const aliases = s.aliasNumbers ?? []
        const duplicate = duplicateAlias(primary, aliases)
        if (duplicate >= 0)
            errors.add(this.i18n.t('errors.SUBSCRIBER_NUMBER_DUPLICATE', {args: {number: numberString(aliases[duplicate])}}), at('aliasNumbers', duplicate))
        if (errors.length)
            return undefined
        if (old && sameNumber(old.primaryNumber, primary) && sameAliases(old.aliasNumbers, aliases))
            return undefined

        const current: SubscriberNumber[] = old ? [old.primaryNumber, ...old.aliasNumbers].filter(n => n != null) : []
        const pool = poolOwner && poolOwner.id != old?.id ? poolOwner.aliasNumbers : undefined
        if (pool) {
            const diff = poolDiff(current, aliases, pool)
            for (const index of diff.notInPool)
                errors.add(this.i18n.t('errors.SUBSCRIBER_NUMBER_NOT_IN_POOL', {args: {number: numberString(aliases[index])}}), at('aliasNumbers', index))
            if (!pbx && primary && poolDiff(current, [primary], pool).notInPool.length)
                errors.add(this.i18n.t('errors.SUBSCRIBER_NUMBER_NOT_IN_POOL', {args: {number: numberString(primary)}}), at('primaryNumber'))
            if (errors.length)
                return undefined
        }

        const wanted = [primary, ...aliases].filter(n => n != null)
        const rows = await this.subscriberRepo.readNumbers(wanted)
        const aliasOwners = await this.subscriberRepo.readAliasOwners(wanted.map(numberString))
        const assign = (number: SubscriberNumber, isPrimary: boolean, isDevId: boolean, pointer: string): SubscriberNumberAssignment | undefined => {
            const row = rows.find(r => sameNumber(r, number))
            const fromPool = pool != undefined && row?.subscriberId != null && row.subscriberId == poolOwner.id
            const owners = aliasOwners.get(numberString(number)) ?? []
            const taken = (row?.subscriberId != null && row.subscriberId != old?.id && !fromPool)
                || owners.some(id => id != old?.provisioningId && !(fromPool && id == poolOwner.provisioningId))
            if (taken) {
                errors.add(this.i18n.t('errors.SUBSCRIBER_NUMBER_IN_USE', {args: {number: numberString(number)}}), pointer)
                return undefined
            }
            return {number, numberId: row?.id, isPrimary, isDevId, fromProvisioningId: fromPool ? poolOwner.provisioningId : undefined}
        }
        const plannedPrimary = primary ? assign(primary, true, false, at('primaryNumber')) : null
        const plannedAliases = aliases.map((alias, index) => assign(
            alias,
            false,
            alias.isDevId ?? old?.aliasNumbers.find(a => sameNumber(a, alias))?.isDevId ?? false,
            at('aliasNumbers', index),
        ))
        if (errors.length)
            return undefined
        const released: SubscriberNumberRelease[] = current
            .filter(number => !wanted.some(w => sameNumber(w, number)))
            .map(number => ({
                numberId: number.numberId,
                number,
                toOwner: pool && !(pbx && sameNumber(number, old.primaryNumber))
                    ? {id: poolOwner.id, provisioningId: poolOwner.provisioningId, provisioningDomainId: poolOwner.provisioningDomainId}
                    : undefined,
            }))
        return {primary: plannedPrimary, aliases: plannedAliases, released}
    }

    /**
     * Profile of the customer's reseller's profile set: the given one or the set's default; resolved only when set
     * or profile change
     */
    private async resolveProfile(s: internal.Subscriber, old: internal.Subscriber | undefined, customer: SubscriberCustomer, at: Pointer, errors: ApiErrors): Promise<void> {
        if (old && sameValue('profileSetId', old, s) && sameValue('profileId', old, s))
            return
        if (s.profileSetId == null) {
            if (s.profileId != null)
                errors.add(this.i18n.t('errors.SUBSCRIBER_PROFILE_SET_REQUIRED'), at('profileId'))
            s.profileSetId = null
            s.profileId = null
            return
        }
        const set = await this.subscriberRepo.readProfileSet(s.profileSetId)
        if (!set || set.resellerId != customer.resellerId) {
            errors.add(this.i18n.t('errors.SUBSCRIBER_PROFILE_SET_INVALID'), at('profileSetId'))
            return
        }
        const profiles = await this.subscriberRepo.readProfiles(set.id)
        if (s.profileId != null) {
            if (!profiles.some(profile => profile.id == s.profileId))
                errors.add(this.i18n.t('errors.SUBSCRIBER_PROFILE_INVALID'), at('profileId'))
            return
        }
        const profile = profiles.find(p => p.setDefault)
        if (!profile)
            errors.add(this.i18n.t('errors.SUBSCRIBER_PROFILE_UNDETERMINED'), at('profileId'))
        else
            s.profileId = profile.id
    }

    /**
     * SIP and web password: generated or required on create, unchanged when omitted on update; reuse checked
     * against the journals when validation is enabled, journals written when they keep passwords
     */
    private async preparePasswords(s: internal.Subscriber, old: internal.Subscriber | undefined, plan: SubscriberWritePlan, at: Pointer, errors: ApiErrors): Promise<void> {
        const config = this.app.config.security.password
        if (!old) {
            if (s.password == undefined && config.sip_autogenerate)
                s.password = generatePassword(config.min_length || 12)
            if (s.password == undefined)
                errors.add(this.i18n.t('errors.SUBSCRIBER_PASSWORD_REQUIRED'), at('password'))
            if (s.webpassword == undefined && config.web_autogenerate)
                s.webpassword = generatePassword(config.min_length || 12)
        }
        const journals: ['password' | 'webpassword', boolean, boolean, number][] = [
            ['password', false, config.sip_validate, config.sip_keep_last_used],
            ['webpassword', true, config.web_validate, config.web_keep_last_used],
        ]
        for (const [field, web, validate, keep] of journals) {
            const password: string = s[field]
            if (password == undefined)
                continue
            if (old && validate && keep > 0
                && await isPasswordInJournal(password, await this.subscriberRepo.readPasswordJournal(old.provisioningId, web)))
                errors.add(this.i18n.t('errors.PASSWORD_ALREADY_USED'), at(field))
            if (keep > 0) {
                const entry = {hash: await passwordJournalHash(password), keep}
                if (web)
                    plan.webpasswordJournal = entry
                else
                    plan.passwordJournal = entry
            }
        }
        if (s.webpassword != undefined)
            plan.webpasswordHash = await saltedPassword(s.webpassword)
    }

    private primaryNumberPreferences(number: SubscriberNumber): Record<string, string | null> {
        return {cc: `${number.cc}`, ac: number.ac || null}
    }

    /**
     * Preferences that follow a new primary number: cc/ac, cli (when it was synced to the old number), the
     * voicemail box and call forwards to the voicebox, fax2mail and conferences
     */
    private async primaryNumberChangeEffects(s: internal.Subscriber, oldPrimary: SubscriberNumber | null, newPrimary: SubscriberNumber | null): Promise<Pick<SubscriberWritePlan, 'preferences' | 'voicemail' | 'forwards'>> {
        const stored = await this.subscriberRepo.readPreferences(s.provisioningId, ['cli', 'voicemail_echo_number'])
        const cli = stored.get('cli')?.[0]
        const preferences: Record<string, string | null> = newPrimary ? this.primaryNumberPreferences(newPrimary) : {}
        let newCli = cli
        if (this.app.config.numbermanagement.auto_sync_cli && (cli == undefined || (oldPrimary && cli == numberString(oldPrimary)))) {
            newCli = newPrimary ? numberString(newPrimary) : undefined
            if (newCli != undefined || cli != undefined)
                preferences.cli = newCli ?? null
        }
        const mailbox = stored.get('voicemail_echo_number')?.[0] ?? newCli
        return {
            preferences,
            voicemail: mailbox ? {mailbox} : undefined,
            forwards: {number: newPrimary ? numberString(newPrimary) : s.uuid, primaryRemoved: !newPrimary},
        }
    }

    private buildSubscriberPreferences(s: internal.Subscriber, pbx: boolean, pilot: internal.Subscriber | undefined): Record<string, string | null> {
        const preferences: Record<string, string | null> = {
            display_name: s.displayName || null,
            ext_subscriber_id: s.externalId ?? null,
            lock: s.lock ?? null,
        }
        if (!pbx)
            return preferences
        const base = s.isPbxPilot ? s.primaryNumber : pilot?.primaryNumber
        Object.assign(preferences, {
            cloud_pbx: '1',
            cloud_pbx_ext: s.pbxExtension || null,
            shared_buddylist_visibility: '1',
            ...base ? {cloud_pbx_base_cli: numberString(base)} : {},
        })
        if (s.isPbxGroup) {
            Object.assign(preferences, {
                cloud_pbx_hunt_policy: s.pbxHuntPolicy ?? null,
                cloud_pbx_hunt_timeout: s.pbxHuntTimeout != null ? `${s.pbxHuntTimeout}` : null,
                cloud_pbx_hunt_cancel_mode: s.pbxHuntCancelMode ?? null,
            })
        }
        return preferences
    }
}
