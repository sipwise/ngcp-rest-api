import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsEnum, IsInt, IsString} from 'class-validator'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {Expandable} from '~/decorators/expandable.decorator'
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
    @ApiProperty({description: 'Unique identifier of the contract'})
        id: number

    @ApiPropertyOptional({description: 'Explicitly declare the way how you want to set billing profiles for this API call.'})
        billing_profile_definition: ContractBillingProfileDefinition

    @ApiPropertyOptional({
        description: 'The billing profile id used to charge this contract, which will become active immediately. ' +
            'This field is required if the profile definition mode is not defined or the "id" mode is used.',
    })
        billing_profile_id: number

    @IsInt()
    @ApiProperty({description: 'The contact id this contract belongs to'})
    @Expandable({name: 'contact_id', controller: 'contactController'})
        contact_id?: number

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'A non-unique external ID e.g., provided by a 3rd party provisioning'})
        external_id: string

    @IsEnum(ContractStatus)
    @ApiProperty({description: 'The status of the contract'})
        status?: ContractStatus

    @IsEnum(ContractType)
    @ApiProperty({description: 'The type of contract'})
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
