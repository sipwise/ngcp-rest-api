import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class PeeringInboundRuleSearchDto {
    @ApiPropertyOptional()
        name: string
    @ApiPropertyOptional()
        group_id: number
    @ApiPropertyOptional()
        field: string
    @ApiPropertyOptional()
        pattern: string
    @ApiPropertyOptional()
        priority: number
    @ApiPropertyOptional()
        reject_code: number
    @ApiPropertyOptional()
        reject_reason: string
    @ApiPropertyOptional()
        enabled: boolean
    @ApiPropertyOptional()
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'rule.id',
        }
}
