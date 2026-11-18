import {ApiProperty} from '@nestjs/swagger'
import {IsEnum, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString} from 'class-validator'

import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'
import {
    ContractBillingProfileDefinition,
    ContractStatus,
    ContractType,
} from '~/entities/internal/contract.internal.entity'

export class ContractRequestDto implements RequestDto {
    @IsOptional()
    @IsIn([ContractBillingProfileDefinition.ID])
    @IsNotEmpty()
    @ApiProperty({
        description: 'Billing profile field to use, only `id`',
        enum: [ContractBillingProfileDefinition.ID],
    })
        billing_profile_definition?: ContractBillingProfileDefinition

    @IsNumber()
    @ApiProperty({
        description: 'Billing profile charging the contract, active immediately',
    })
        billing_profile_id: number

    @IsNumber()
    @ApiProperty({description: 'Contact of the contract'})
        contact_id?: number

    @IsOptional()
    @IsNotEmpty()
    @IsString()
    @ApiProperty({description: 'Non-unique external id, e.g. from third-party provisioning'})
        external_id?: string

    @IsNotEmpty()
    @IsEnum(ContractStatus)
    @ApiProperty({description: 'State of the contract'})
        status?: ContractStatus

    @IsNotEmpty()
    @IsEnum(ContractType)
    @ApiProperty({description: '`sippeering` for peerings, `reseller` for resellers'})
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
        const fields = {
            billing_profile_definition: this.billing_profile_definition,
            billing_profile_id: this.billing_profile_id,
            contact_id: this.contact_id,
            external_id: this.external_id,
            status: this.status,
            type: this.type,
        }
        // only the request's fields: the other columns of the contract aren't touched
        if (options.assignNulls) {
            Object.keys(fields).forEach(k => {
                if (fields[k] === undefined)
                    fields[k] = null
            })
        }
        const contract = internal.Contract.create(fields)
        if (options.id)
            contract.id = options.id
        return contract
    }
}


