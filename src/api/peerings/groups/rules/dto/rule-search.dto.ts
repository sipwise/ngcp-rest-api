import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class PeeringRuleSearchDto {
    @ApiPropertyOptional()
        name: string
    @ApiPropertyOptional()
        group_id: number
    @ApiPropertyOptional()
        callee_prefix: string
    @ApiPropertyOptional()
        callee_pattern: string
    @ApiPropertyOptional()
        caller_pattern: string
    @ApiPropertyOptional()
        description: string
    @ApiPropertyOptional()
        enabled: boolean
    @ApiPropertyOptional()
        stopper: boolean
    @ApiPropertyOptional()
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'rule.id',
        }
}
