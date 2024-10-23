import {Type} from 'class-transformer'
import {IsInt, IsOptional} from 'class-validator'
import {RequestParamDto} from '~/dto/request-param.dto'

export class HeaderManipulationRuleActionRequestParamDto extends RequestParamDto {
    @Type(() => Number)
    @IsInt()
    @IsOptional()
        setId?: number

    @Type(() => Number)
    @IsInt()
    @IsOptional()
        ruleId?: number
}