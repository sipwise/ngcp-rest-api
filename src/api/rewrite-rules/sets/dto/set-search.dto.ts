import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class RewriteRuleSetSearchDto {
    @ApiPropertyOptional({description: 'Reseller of the rewrite rule set; required for admin roles, the own reseller for reseller roles'})
        reseller_id: number
    @ApiPropertyOptional({description: 'Description of the rewrite rule set'})
        description: number
    @ApiPropertyOptional({description: 'Name of the rewrite rule set'})
        name: string
    @ApiPropertyOptional({description: 'Id of the rewrite rule set'})
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'rewriteRuleSet.id',
        }
}
