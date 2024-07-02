import {IsEnum, IsNotEmpty, IsNumber, IsOptional, MaxLength} from 'class-validator'

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
    @IsNumber()
    @IsNotEmpty()
        id: number

    @IsNumber()
    @IsNotEmpty()
        ruleId: number

    @IsEnum(HeaderRuleConditionMatchType)
    @IsNotEmpty()
        matchType: HeaderRuleConditionMatchType

    @IsEnum(HeaderRuleConditionMatchPart)
    @IsNotEmpty()
        matchPart: HeaderRuleConditionMatchPart

    @IsNotEmpty()
    @MaxLength(255)
        matchName: string

    @IsEnum(HeaderRuleConditionExpression)
    @IsNotEmpty()
        expression: HeaderRuleConditionExpression

    @IsNotEmpty()
        expressionNegation: boolean

    @IsEnum(HeaderRuleConditionValueType)
    @IsNotEmpty()
        valueType: HeaderRuleConditionValueType

    @IsOptional()
    @IsNumber()
        rwrSetId: number

    @IsOptional()
    @IsNumber()
        rwrDpId: number

    @IsNotEmpty()
        enabled: boolean

    @IsOptional()
        values?: string[]
}

