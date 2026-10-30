import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {
    ContractBillingProfileDefinition,
    ContractStatus,
    ContractType,
} from '~/entities/internal/contract.internal.entity'

export class ContractSearchDto {
    @ApiPropertyOptional()
        billing_profile_definition: ContractBillingProfileDefinition
    @ApiPropertyOptional()
        billing_profile_id: number
    @ApiPropertyOptional()
        contact_id?: number
    @ApiPropertyOptional()
        external_id: string
    @ApiPropertyOptional()
        status?: ContractStatus
    @ApiPropertyOptional()
        type?: ContractType
    @ApiPropertyOptional()
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'contract.id',
        }
}
