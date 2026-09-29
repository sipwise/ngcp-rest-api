import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'

export class ResellerSearchDto {
    @ApiPropertyOptional()
        contract_id: number = undefined
    @ApiPropertyOptional()
        name?: string = undefined
    @ApiPropertyOptional()
        status?: ResellerStatus = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiHideProperty()
    _alias = {
        id: 'reseller.id',
    }
}
