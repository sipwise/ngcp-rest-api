
import {HeaderRuleConditionValue} from './header-rule-condition-value.internal.entity'

import {RwrDpEnum} from '~/enums/rwr-dp.enum'
import {LazyCounts} from '~/interfaces/lazy-field-source.interface'

export enum HeaderRuleConditionMatchType {
    Header = 'header',
    Preference = 'preference',
    Avp = 'avp',
}

export enum HeaderRuleConditionMatchPart {
    Full = 'full',
    Username = 'username',
    Domain = 'domain',
    Port = 'port',
}

export enum HeaderRuleConditionExpression {
    Is = 'is',
    Contains = 'contains',
    Matches = 'matches',
    Regexp = 'regexp',
}

export enum HeaderRuleConditionValueType {
    Input = 'input',
    Preference = 'preference',
    Avp = 'avp',
}

export class HeaderRuleCondition {
    id: number
    ruleId: number
    matchType: HeaderRuleConditionMatchType
    matchPart: HeaderRuleConditionMatchPart
    matchName: string
    expression: HeaderRuleConditionExpression
    expressionNegation: boolean
    valueType: HeaderRuleConditionValueType
    rwrSetId: number
    rwrDpId: number
    rwrDp?: RwrDpEnum
    enabled: boolean
    // requested values of a write
    values?: string[]
    // stored values of a read, undefined when not loaded (lazy, not inlined)
    storedValues?: HeaderRuleConditionValue[]
    lazyCounts?: LazyCounts
}

