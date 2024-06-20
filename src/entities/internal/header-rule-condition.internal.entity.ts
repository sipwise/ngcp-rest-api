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
