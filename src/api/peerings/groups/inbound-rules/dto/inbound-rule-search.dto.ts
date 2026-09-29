import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class PeeringInboundRuleSearchDto {
    @ApiPropertyOptional()
        name: string = undefined
    @ApiPropertyOptional()
        group_id: number = undefined
    @ApiPropertyOptional()
        field: string = undefined
    @ApiPropertyOptional()
        pattern: string = undefined
    @ApiPropertyOptional()
        priority: number = undefined
    @ApiPropertyOptional()
        reject_code: number = undefined
    @ApiPropertyOptional()
        reject_reason: string = undefined
    @ApiPropertyOptional()
        enabled: boolean = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiHideProperty()
    _alias = {
        id: 'rule.id',
    }
}
