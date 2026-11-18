import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'

export class ResellerSearchDto {
    @ApiPropertyOptional({description: 'Reseller contract'})
        contract_id: number
    @ApiPropertyOptional({description: 'Unique name of the reseller'})
        name?: string
    @ApiPropertyOptional({description: 'State of the reseller'})
        status?: ResellerStatus
    @ApiPropertyOptional({description: 'Id of the reseller'})
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'reseller.id',
        }
}
