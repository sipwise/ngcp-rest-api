import {RbacRole} from '~/config/constants.config'

/**
 * Call list suppressions (billing.call_list_suppressions): numbers matching a pattern are shown
 * with a label (obfuscate) or hidden (filter) in call lists
 */

export enum CallListSuppressionDirection {
    Outgoing = 'outgoing',
    Incoming = 'incoming',
}

export enum CallListSuppressionMode {
    Disabled = 'disabled',
    Filter = 'filter',
    Obfuscate = 'obfuscate',
}

export interface CallListSuppression {
    id: number
    label: string
    mode: CallListSuppressionMode
}

const modeDetail: Partial<Record<CallListSuppressionMode, string>> = {
    [CallListSuppressionMode.Obfuscate]: 'obfuscated',
    [CallListSuppressionMode.Filter]: 'filtered',
}

/**
 * Users of these roles see the suppressed numbers with the suppression appended, nothing is hidden
 */
export function isShowCallListSuppressions(role: string): boolean {
    return role == RbacRole.admin || role == RbacRole.system || role == RbacRole.reseller
}

/**
 * Subquery returning the id of the first suppression of the direction and modes matching the cdr
 * (outgoing: destination_user_in and source_domain, incoming: source_cli and destination_domain)
 */
export function callListSuppressionSubquery(
    direction: CallListSuppressionDirection,
    modes: CallListSuppressionMode[],
    cdrAlias = 'cdr',
): string {
    const [domainColumn, numberColumn] = direction == CallListSuppressionDirection.Incoming
        ? ['destination_domain', 'source_cli']
        : ['source_domain', 'destination_user_in']
    return 'SELECT cls.id FROM billing.call_list_suppressions cls' +
        ` WHERE cls.direction = '${direction}' AND cls.mode IN (${modes.map(m => `'${m}'`).join(', ')})` +
        ` AND (cls.domain = '' OR cls.domain = ${cdrAlias}.${domainColumn})` +
        ` AND ${cdrAlias}.${numberColumn} REGEXP cls.pattern ORDER BY cls.id LIMIT 1`
}

/**
 * Applies the suppression to a number: appends " (obfuscated: label)" / " (filtered: label)" when
 * suppressions are shown, otherwise an obfuscated number is replaced by the label
 */
export function suppressNumber(number: string, suppression: CallListSuppression | undefined, show: boolean): string {
    if (!suppression)
        return number
    if (!show)
        return suppression.mode == CallListSuppressionMode.Obfuscate ? suppression.label : number
    const detail = modeDetail[suppression.mode]
    return detail ? `${number} (${detail}: ${suppression.label})` : number
}
