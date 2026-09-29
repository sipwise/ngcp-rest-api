import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {
    ContractBillingProfileDefinition,
    ContractStatus,
    ContractType,
} from '~/entities/internal/contract.internal.entity'

export class ContractSearchDto {
    @ApiPropertyOptional()
        billing_profile_definition: ContractBillingProfileDefinition = undefined
    @ApiPropertyOptional()
        billing_profile_id: number = undefined
    @ApiPropertyOptional()
        contact_id?: number = undefined
    @ApiPropertyOptional()
        external_id: string = undefined
    @ApiPropertyOptional()
        status?: ContractStatus = undefined
    @ApiPropertyOptional()
        type?: ContractType = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiHideProperty()
    _alias = {
        id: 'contract.id',
    }
}
