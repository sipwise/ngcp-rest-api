import {Injectable} from '@nestjs/common'
import {In, SelectQueryBuilder} from 'typeorm'

import {SubscriberSearchDto} from '~/api/subscribers/dto/subscriber-search.dto'
import {SubscriberRepository, SubscriberScope} from '~/api/subscribers/interfaces/subscriber.repository'
import {db, internal} from '~/entities'
import {ProductClass} from '~/entities/internal/product.internal.entity'
import {VoipSubscriberStatus} from '~/entities/internal/voip-subscriber.internal.entity'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

const subscriberClasses = [ProductClass.SipAccount, ProductClass.PbxAccount]

@Injectable()
export class SubscriberMariadbRepository extends MariaDbRepository implements SubscriberRepository {
    private readonly log = new LoggerService(SubscriberMariadbRepository.name)

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

    /**
     * Non-terminated subscribers of sipaccount and pbxaccount customers within the scope
     */
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
}
