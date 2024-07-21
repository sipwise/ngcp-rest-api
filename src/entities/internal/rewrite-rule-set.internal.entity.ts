import {IsNotEmpty, IsNumber, IsOptional, MaxLength} from 'class-validator'

export class RewriteRuleSet {
    @IsNumber()
    @IsNotEmpty()
        id: number

    @IsNumber()
    @IsNotEmpty()
        resellerId: number

    @MaxLength(32)
    @IsNotEmpty()
        name: string

    @MaxLength(255)
        description?: string

    @IsNumber()
    @IsOptional()
        callerInDpid?: number

    @IsNumber()
    @IsOptional()
        calleeInDpid?: number

    @IsNumber()
    @IsOptional()
        callerOutDpid?: number

    @IsNumber()
    @IsOptional()
        calleeOutDpid?: number

    @IsNumber()
    @IsOptional()
        callerLnpDpid?: number

    @IsNumber()
    @IsOptional()
        calleeLnpDpid?: number
}