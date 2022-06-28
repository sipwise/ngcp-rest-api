import {ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty} from 'class-validator'
import {
    ContractBillingProfileDefinition,
    ContractStatus,
    ContractType,
} from '../../../entities/internal/contract.internal.entity'
import {internal} from '../../../entities'

export class ContractCreateDto {
    @ApiProperty({description: 'Explicitly declare the way how you want to set billing profiles for this API call.'})
        billing_profile_definition: ContractBillingProfileDefinition

    @ApiProperty({
        description: 'The billing profile id used to charge this contract, which will become active immediately. ' +
            'This field is required if the profile definition mode is not defined or the "id" mode is used.',
    })
        billing_profile_id: number

    @ApiProperty({description: 'The contact id this contract belongs to'})
        contact_id?: number

    @ApiProperty({description: 'A non-unique external ID e.g., provided by a 3rd party provisioning'})
    @IsNotEmpty()
        external_id: string

    @ApiProperty({description: 'The status of the contract'})
        status?: ContractStatus

    @ApiProperty({description: 'The type of contract'})
        type?: ContractType

    toInternal(): internal.Contract {
        return internal.Contract.create({
            billing_profile_definition: this.billing_profile_definition,
            billing_profile_id: this.billing_profile_id,
            contact_id: this.contact_id,
            external_id: this.external_id,
            status: this.status,
            type: this.type,
        })
    }
}


