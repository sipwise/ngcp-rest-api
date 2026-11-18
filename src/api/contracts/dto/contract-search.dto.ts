import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {
    ContractBillingProfileDefinition,
    ContractStatus,
    ContractType,
} from '~/entities/internal/contract.internal.entity'

export class ContractSearchDto {
    @ApiPropertyOptional({description: 'Billing profile field to use, only `id`'})
        billing_profile_definition: ContractBillingProfileDefinition
    @ApiPropertyOptional({description: 'Billing profile charging the contract, active immediately'})
        billing_profile_id: number
    @ApiPropertyOptional({description: 'Contact of the contract'})
        contact_id?: number
    @ApiPropertyOptional({description: 'Non-unique external id, e.g. from third-party provisioning'})
        external_id: string
    @ApiPropertyOptional({description: 'State of the contract'})
        status?: ContractStatus
    @ApiPropertyOptional({description: '`sippeering` for peerings, `reseller` for resellers'})
        type?: ContractType
    @ApiPropertyOptional({description: 'Id of the contract'})
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'contract.id',
        }
}
