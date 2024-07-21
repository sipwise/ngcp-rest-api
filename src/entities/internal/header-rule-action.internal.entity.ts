
import {IsEnum, IsNotEmpty, IsNumber, IsOptional, MaxLength} from 'class-validator'
import {RwrDpEnum} from '../../enums/rwr-dp.enum'

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
    @IsNumber()
    @IsNotEmpty()
        id: number

    @IsNumber()
    @IsNotEmpty()
        ruleId: number

    @MaxLength(255)
    @IsNotEmpty()
        header: string

    @IsEnum(HeaderRuleActionHeaderPart)
    @IsNotEmpty()
        headerPart: HeaderRuleActionHeaderPart

    @IsEnum(HeaderRuleActionActionType)
    @IsNotEmpty()
        actionType: HeaderRuleActionActionType

    @IsEnum(HeaderRuleActionValuePart)
    @IsNotEmpty()
        valuePart: HeaderRuleActionValuePart

    @IsOptional()
    @MaxLength(255)
        value?: string

    @IsOptional()
    @IsNumber()
        rwrSetId?: number

    @IsOptional()
    @IsNumber()
        rwrDp?: RwrDpEnum

    @IsOptional()
    @IsNumber()
        rwrDpId?: number

    @IsOptional()
    @IsNumber()
        priority?: number

    @IsOptional()
        enabled?: boolean
}
