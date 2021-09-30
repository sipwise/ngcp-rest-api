import {ContractStatus, ContractType} from '../contracts.constants'
import {IsNotEmpty} from 'class-validator'
import {ApiProperty} from '@nestjs/swagger'

export class ContractBaseDto {
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
}

enum ContractBillingProfileDefinition {
    ID = 'id',
    Profiles = 'profiles',
    Package = 'package'
}
