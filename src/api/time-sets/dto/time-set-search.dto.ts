import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class TimeSetSearchDto {
    @ApiPropertyOptional({description: 'Id of the time set'})
        id: number
    @ApiPropertyOptional({description: 'Reseller of the time set; required for admin roles, the own reseller for reseller roles'})
        reseller_id: number
    @ApiPropertyOptional({description: 'Name of the time set, unique across all resellers'})
        name: string
    @ApiHideProperty()
        _alias = {
            id: 'timeSet.id',
        }
}
