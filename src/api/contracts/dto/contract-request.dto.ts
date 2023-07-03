import {ApiProperty} from '@nestjs/swagger'
import {IsEnum, IsNotEmpty, IsNumber} from 'class-validator'
import {
    ContractBillingProfileDefinition,
    ContractStatus,
    ContractType,
} from '../../../entities/internal/contract.internal.entity'
import {internal} from '../../../entities'
import {RequestDto, RequestDtoOptions} from '../../../dto/request.dto'

export class ContractRequestDto implements RequestDto {
    @IsEnum(ContractBillingProfileDefinition)
    @IsNotEmpty()
    @ApiProperty({description: 'Explicitly declare the way how you want to set billing profiles for this API call.'})
        billing_profile_definition: ContractBillingProfileDefinition

    @IsNumber()
    @ApiProperty({
        description: 'The billing profile id used to charge this contract, which will become active immediately. ' +
            'This field is required if the profile definition mode is not defined or the "id" mode is used.',
    })
        billing_profile_id: number

    @IsNumber()
    @ApiProperty({description: 'The contact id this contract belongs to'})
        contact_id?: number

    @IsNotEmpty()
    @ApiProperty({description: 'A non-unique external ID e.g., provided by a 3rd party provisioning'})
        external_id: string

    @IsNotEmpty()
    @IsEnum(ContractStatus)
    @ApiProperty({description: 'The status of the contract'})
        status?: ContractStatus

    @IsNotEmpty()
    @IsEnum(ContractType)
    @ApiProperty({description: 'The type of contract'})
        type?: ContractType

    constructor(entity?: internal.Contract) {
        if (!entity)
            return

        // TODO rework as the Dto key names are not always equal to the Entity ones
        Object.keys(entity).map(key => {
            this[key] = entity[key]
        })
    }

    toInternal(options: RequestDtoOptions = {}): internal.Contract {
        const contract = internal.Contract.create({
            billing_profile_definition: this.billing_profile_definition,
            billing_profile_id: this.billing_profile_id,
            contact_id: this.contact_id,
            external_id: this.external_id,
            status: this.status,
            type: this.type,
        })
        if (options.id)
            contract.id = options.id
        return contract
    }
}


