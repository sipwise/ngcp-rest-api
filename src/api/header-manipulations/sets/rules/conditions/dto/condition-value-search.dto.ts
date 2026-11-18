import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class HeaderManipulationRuleConditionValueSearchDto {
    @ApiPropertyOptional({description: 'Id of the condition value'})
        id: number
    @ApiPropertyOptional({description: 'Value the source value is compared with'})
        value: string
    @ApiHideProperty()
        _alias = {
            id: 'value.id',
            value: 'value.value',
        }
}
