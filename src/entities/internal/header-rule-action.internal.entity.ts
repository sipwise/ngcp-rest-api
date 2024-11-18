

import {RwrDpEnum} from '~/enums/rwr-dp.enum'

export enum HeaderRuleActionHeaderPart {
    Full = 'full',
    Username = 'username',
    Domain = 'domain',
    Port = 'port',
}

export enum HeaderRuleActionActionType {
    Set = 'set',
    Add = 'add',
    Remove = 'remove',
    Rsub = 'rsub',
    Header = 'header',
    Preference = 'preference',
}

export enum HeaderRuleActionValuePart {
    Full = 'full',
    Username = 'username',
    Domain = 'domain',
    Port = 'port',
}

export class HeaderRuleAction {

    id: number

    ruleId: number

    header: string

    headerPart: HeaderRuleActionHeaderPart

    actionType: HeaderRuleActionActionType

    valuePart: HeaderRuleActionValuePart

    value?: string
    rwrSetId?: number

    rwrDp?: RwrDpEnum

    rwrDpId?: number

    priority?: number

    enabled?: boolean
}
