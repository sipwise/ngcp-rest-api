import {ApiProperty} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {IsArray, IsBoolean, IsDate, IsEnum, IsInt, IsString, ValidateNested} from 'class-validator'

import {BillingMappingResponseDto} from './billing-mapping-response.dto'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {Expandable} from '~/decorators/expandable.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {BillingMapping} from '~/entities/internal'
import {
    ContractStatus as CustomerStatus,
} from '~/entities/internal/contract.internal.entity'
import {CustomerType} from '~/entities/internal/customer.internal.entity'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class CustomerResponseDto extends ResponseDto {
    @IsBoolean()
    @ApiProperty()
        add_vat: boolean

    @IsArray()
    @ValidateNested({each: true})
    @Type(() => BillingMappingResponseDto)
    @ApiProperty()
        all_billing_profiles: BillingMappingResponseDto[]

    @IsArray()
    @ValidateNested({each: true})
    @Type(() => BillingMapping)
    @ApiProperty()
        billing_profiles: BillingMapping[]

    @CanBeNull()
    @IsInt()
    @ApiProperty()
        billing_profile_id: number

    @IsInt()
    @ApiProperty({description: 'The contact id this contract belongs to'})
    @Expandable({name:'contact_id', controller: 'contactController'})
        contact_id?: number

    @IsDate()
    @ApiProperty()
        create_timestamp: Date

    @IsString()
    @ApiProperty({description: 'A non-unique external ID e.g., provided by a 3rd party provisioning'})
        external_id: string

    @IsInt()
    @ApiProperty({description: 'Unique identifier of the contract'})
        id: number

    @CanBeNull()
    @IsInt()
    @ApiProperty()
        invoice_email_template_id: number

    @CanBeNull()
    @IsInt()
    @ApiProperty()
        invoice_template_id: number

    @IsInt()
    @ApiProperty()
        max_subscribers: number

    @IsDate()
    @ApiProperty()
        modify_timestamp: Date

    @CanBeNull()
    @IsInt()
    @ApiProperty()
        passreset_email_template_id: number

    @CanBeNull()
    @IsInt()
    @ApiProperty()
        profile_package_id: number

    @IsEnum(CustomerStatus)
    @ApiProperty({description: 'The status of the contract'})
        status: CustomerStatus

    @CanBeNull()
    @IsInt()
    @ApiProperty()
        subscriber_email_template_id: number

    @IsDate()
    @ApiProperty()
        terminate_timestamp: Date

    @IsEnum(CustomerType)
    @ApiProperty({description: 'The type of contract'})
        type?: CustomerType

    @IsInt()
    @ApiProperty()
        vat_rate: number

    constructor(data: internal.Customer, options?: ResponseDtoOptions) {
        super(options)
        this.id = data.id
        this.add_vat = data.addVat
        this.all_billing_profiles = data.allBillingMappings.map(mapping => new BillingMappingResponseDto(mapping))
        this.billing_profile_id = data.billingProfileId
        this.billing_profiles = data.futureMappings
        this.contact_id = data.contactId
        this.create_timestamp = data.createTimestamp
        this.external_id = data.externalId
        this.max_subscribers = data.maxSubscribers
        this.modify_timestamp = data.modifyTimestamp
        this.profile_package_id = data.profilePackageId
        this.status = data.status
        this.terminate_timestamp = data.terminateTimestamp
        this.type = data.type
        this.vat_rate = data.vatRate
    }
}
