import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class PeeringInboundRuleSearchDto {
    @ApiHideProperty()
        name: string
    @ApiPropertyOptional({description: 'Peering group of the rule'})
        group_id: number
    @ApiPropertyOptional({description: 'Field of the inbound SIP message the pattern is matched against'})
        field: string
    @ApiPropertyOptional({description: 'PCRE regex matched against the field, e.g. `^sip:431` for a full URI'})
        pattern: string
    @ApiPropertyOptional({description: 'Priority of the rule, unique within the group; lower values are checked first'})
        priority: number
    @ApiPropertyOptional({description: 'SIP code (400-699) to reject calls from the group servers that do not match the pattern; null = no rejection'})
        reject_code: number
    @ApiPropertyOptional({description: 'Reason phrase of the rejection; used with reject_code'})
        reject_reason: string
    @ApiPropertyOptional({description: 'Rule is enabled'})
        enabled: boolean
    @ApiPropertyOptional({description: 'Id of the peering group inbound rule'})
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'rule.id',
        }
}
