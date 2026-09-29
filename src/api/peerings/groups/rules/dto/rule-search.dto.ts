import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class PeeringRuleSearchDto {
    @ApiPropertyOptional()
        name: string = undefined
    @ApiPropertyOptional()
        group_id: number = undefined
    @ApiPropertyOptional()
        callee_prefix: string = undefined
    @ApiPropertyOptional()
        callee_pattern: string = undefined
    @ApiPropertyOptional()
        caller_pattern: string = undefined
    @ApiPropertyOptional()
        description: string = undefined
    @ApiPropertyOptional()
        enabled: boolean = undefined
    @ApiPropertyOptional()
        stopper: boolean = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiHideProperty()
    _alias = {
        id: 'rule.id',
    }
}
