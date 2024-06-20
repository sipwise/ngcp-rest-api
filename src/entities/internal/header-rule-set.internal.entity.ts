import {IsNotEmpty, IsNumber, IsOptional, MaxLength} from 'class-validator'

export class HeaderRuleSet {
    @IsNumber()
    @IsNotEmpty()
        id: number

    @IsNumber()
    @IsNotEmpty()
        resellerId: number

    @IsOptional()
    @IsNumber()
        subscriberId?: number

    @MaxLength(255)
    @IsNotEmpty()
        name: string

    @MaxLength(255)
        description?: string
}