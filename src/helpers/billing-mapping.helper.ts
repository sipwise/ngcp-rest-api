import {SelectQueryBuilder} from 'typeorm'

import {toLocalDateTime} from './date.helper'

import {internal} from '~/entities'
import {BillingProfileStatus} from '~/entities/internal/billing-profile.internal.entity'

/**
 * Billing mappings (billing.contracts_billing_profile_network_schedule) shared by the contract endpoints;
 * error results are errors.json keys
 */

export interface BillingIntervalError {
    index?: number
    key: string
}

/**
 * Mappings argument of billing.schedule_contract_billing_profile_network: "start,end,profile,network,;" per
 * mapping, dates in server local time
 */
export function billingMappingsCsv(mappings: internal.BillingMapping[]): string {
    return mappings.map(mapping => [
        mapping.startDate ? toLocalDateTime(mapping.startDate) : '',
        mapping.endDate ? toLocalDateTime(mapping.endDate) : '',
        mapping.billingProfileId ?? '',
        mapping.networkId ?? '',
    ].join(',') + ',;').join('')
}

/**
 * Restricts a ContractBillingProfileNetworkSchedule query (alias cbpns, joined profileNetwork as profile_network)
 * to the mapping of the contract active at the time, latest first; times before the contract creation
 * use the creation time
 */
export function andWhereActualBillingMapping<T>(
    qb: SelectQueryBuilder<T>,
    contract: Pick<internal.Contract, 'id' | 'create_timestamp' | 'modify_timestamp'>,
    at: Date,
): SelectQueryBuilder<T> {
    const createdAt = contract.create_timestamp ?? contract.modify_timestamp
    if (createdAt && at < createdAt)
        at = createdAt
    return qb
        .andWhere('profile_network.contract_id = :contract_id', {contract_id: contract.id})
        .andWhere('profile_network.base = 1')
        .andWhere('cbpns.effective_start_time <= :epoch', {epoch: Math.floor(at.getTime() / 1000)})
        .orderBy('cbpns.effective_start_time', 'DESC')
}

/**
 * Billing profile check of a mapping; the reseller is only checked when both have one
 */
export function billingProfileError(profile: internal.BillingProfile | undefined, resellerId?: number): string | undefined {
    if (!profile)
        return 'INVALID_BILLING_PROFILE_ID'
    if (profile.status === BillingProfileStatus.Terminated)
        return 'BILLING_PROFILE_ALREADY_TERMINATED'
    if (resellerId != undefined && profile.resellerId != undefined && resellerId != profile.resellerId)
        return 'CONTACT_AND_BILLING_PROFILE_RESELLER_ID_MISMATCH'
    return undefined
}

export function billingNetworkError(network: internal.BillingNetwork | undefined, resellerId?: number): string | undefined {
    if (!network)
        return 'INVALID_BILLING_NETWORK_ID'
    if (resellerId != undefined && network.resellerId != undefined && resellerId != network.resellerId)
        return 'CONTACT_AND_BILLING_NETWORK_RESELLER_ID_MISMATCH'
    return undefined
}

type BillingInterval = Pick<internal.CustomerBillingProfile, 'startDate' | 'endDate' | 'networkId'>

/**
 * Interval of the billing_profiles definition: no dates (open) or a start in the future before its end;
 * the error is on startDate
 */
export function billingIntervalError(interval: BillingInterval, now: Date): string | undefined {
    const start = interval.startDate || undefined
    const end = interval.endDate || undefined
    if (!start && !end)
        return undefined
    if (!start)
        return 'NO_START_DATE_WITH_PROVIDED_END_DATE'
    if (start <= now)
        return 'START_DATE_NOT_IN_FUTURE'
    if (end && start >= end)
        return 'START_AFTER_END_DATE'
    return undefined
}

/**
 * Open intervals of the billing_profiles definition: a create needs one without network, an update must not
 * have any (index of the first one)
 */
export function billingOpenIntervalError(intervals: BillingInterval[], isUpdate: boolean): BillingIntervalError | undefined {
    const isOpen = (interval: BillingInterval): boolean => !interval.startDate && !interval.endDate
    if (isUpdate) {
        const index = intervals.findIndex(isOpen)
        return index < 0 ? undefined : {index, key: 'OPEN_INTERVAL_MAPPING_NOT_ALLOWED'}
    }
    if (!intervals.some(interval => isOpen(interval) && interval.networkId == undefined))
        return {key: 'INITIAL_OPEN_INTERVAL_REQUIRED'}
    return undefined
}
