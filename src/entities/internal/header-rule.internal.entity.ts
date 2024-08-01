import {IsEnum, IsNotEmpty, IsNumber, MaxLength} from 'class-validator'

export enum HeaderRuleDirection {
    AInbound = 'a_inbound',
    BInbound = 'b_inbound',
    AOutbound = 'a_outbound',
    BOutbound = 'b_outbound',
    Local = 'local',
    Peer = 'peer',
    CfInbound = 'cf_inbound',
    CfOutbound = 'cf_outbound',
    Reply = 'reply',
}


export class HeaderRule {
    @IsNumber()
    @IsNotEmpty()
        id: number

    @IsNumber()
    @IsNotEmpty()
        setId: number

    @MaxLength(255)
    @IsNotEmpty()
        name: string

    @MaxLength(255)
        description?: string

    @IsNumber()
    @IsNotEmpty()
        priority: number

    @IsNotEmpty()
    @IsEnum(HeaderRuleDirection)
        direction: HeaderRuleDirection

    @IsNotEmpty()
        stopper: boolean

    @IsNotEmpty()
        enabled: boolean
}