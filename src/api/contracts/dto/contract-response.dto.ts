import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsEnum, IsInt, IsString} from 'class-validator'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {Expand} from '~/decorators/expand.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {
    ContractBillingProfileDefinition,
    ContractStatus,
    ContractType,
} from '~/entities/internal/contract.internal.entity'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class ContractResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty({description: 'Id of the contract'})
        id: number

    @ApiPropertyOptional({description: 'Billing profile field to use, only `id`'})
        billing_profile_definition: ContractBillingProfileDefinition

    @ApiPropertyOptional({
        description: 'Billing profile charging the contract, active immediately',
    })
        billing_profile_id: number

    @IsInt()
    @Expand('contacts')
    @ApiProperty({description: 'Contact of the contract'})
        contact_id?: number

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'Non-unique external id, e.g. from third-party provisioning'})
        external_id: string

    @IsEnum(ContractStatus)
    @ApiProperty({description: 'State of the contract'})
        status?: ContractStatus

    @IsEnum(ContractType)
    @ApiProperty({description: '`sippeering` for peerings, `reseller` for resellers'})
        type?: ContractType

    constructor(data: internal.Contract, options?: ResponseDtoOptions) {
        super(options)
        this.id = data.id
        this.billing_profile_definition = data.billing_profile_definition
        this.billing_profile_id = data.billing_profile_id
        this.contact_id = data.contact_id
        this.external_id = data.external_id
        this.status = data.status
        this.type = data.type
    }
}
