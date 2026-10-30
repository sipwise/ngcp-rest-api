import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'

export class ResellerSearchDto {
    @ApiPropertyOptional()
        contract_id: number
    @ApiPropertyOptional()
        name?: string
    @ApiPropertyOptional()
        status?: ResellerStatus
    @ApiPropertyOptional()
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'reseller.id',
        }
}
