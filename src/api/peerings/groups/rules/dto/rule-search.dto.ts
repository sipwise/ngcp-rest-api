import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class PeeringRuleSearchDto {
    @ApiHideProperty()
        name: string
    @ApiPropertyOptional({description: 'Peering group of the rule'})
        group_id: number
    @ApiPropertyOptional({description: 'Callee number prefix the rule matches, e.g. 43'})
        callee_prefix: string
    @ApiPropertyOptional({description: 'PCRE regex matched against the full Request-URI, e.g. `^sip:431`'})
        callee_pattern: string
    @ApiPropertyOptional({description: 'PCRE regex matched against the caller URI `sip:user@domain`, e.g. `^sip:.+@example\\.org$`'})
        caller_pattern: string
    @ApiPropertyOptional({description: 'Description of the rule'})
        description: string
    @ApiPropertyOptional({description: 'Rule is enabled'})
        enabled: boolean
    @ApiPropertyOptional({description: 'No further rules are processed when this rule matches'})
        stopper: boolean
    @ApiPropertyOptional({description: 'Id of the peering group rule'})
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'rule.id',
        }
}
