import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class HeaderManipulationRuleConditionValueSearchDto {
    @ApiPropertyOptional()
        id: number
    @ApiPropertyOptional()
        value: string
    @ApiHideProperty()
        _alias = {
            id: 'value.id',
            value: 'value.value',
        }
}
