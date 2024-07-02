import {IsEnum, IsNotEmpty, IsNumber, IsOptional, MaxLength} from 'class-validator'

export class HeaderRuleConditionValue {
    @IsNumber()
    @IsNotEmpty()
        id: number

    @IsNumber()
    @IsNotEmpty()
        conditionId: number

    @IsNotEmpty()
    @MaxLength(255)
        value: string
}