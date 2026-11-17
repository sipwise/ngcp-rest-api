import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {
    IsArray,
    IsBoolean,
    IsDate,
    IsDecimal,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator'

import {CustomerBillingProfileResponseDto} from './customer-billing-profile-response.dto'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {DateTimeField} from '~/decorators/date-time-field.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ContractBillingProfileDefinition, ContractStatus as CustomerStatus} from '~/entities/internal/contract.internal.entity'
import {CustomerType} from '~/entities/internal/customer.internal.entity'
import {lazyArray} from '~/helpers/lazy-field.helper'
import {setOwnerTimezone} from '~/helpers/timezone.helper'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class CustomerResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty()
        id: number

    @DateTimeField()
    @IsOptional()
    @CanBeNull()
    @IsDate()
    @ApiPropertyOptional()
        activate_timestamp?: Date

    @IsOptional()
    @IsBoolean()
    @ApiPropertyOptional({default: false})
        add_vat?: boolean = false

    @IsOptional()
    @IsEnum(ContractBillingProfileDefinition)
    @ApiPropertyOptional({
        enum: ContractBillingProfileDefinition,
    })
        billing_profile_definition: ContractBillingProfileDefinition

    @IsNumber()
    @IsOptional()
    @ApiPropertyOptional({
        description:
            'The billing profile id used to charge this contract, required if billing_profile_definition is "id".',
    })
        billing_profile_id?: number

    @IsNumber()
    @ApiProperty({description: 'The contact id this contract belongs to'})
        contact_id: number

    @IsOptional()
    @CanBeNull()
    @IsString()
    @ApiPropertyOptional({description: 'A non-unique external ID e.g., provided by a 3rd party provisioning'})
        external_id?: string

    @DateTimeField()
    @IsDate()
    @ApiProperty()
        create_timestamp: Date

    @IsOptional()
    @CanBeNull()
    @IsNumber()
    @ApiPropertyOptional()
        invoice_email_template_id?: number

    @IsOptional()
    @CanBeNull()
    @IsNumber()
    @ApiPropertyOptional()
        invoice_template_id?: number

    @IsOptional()
    @CanBeNull()
    @IsNumber()
    @ApiPropertyOptional()
        max_subscribers?: number

    @DateTimeField()
    @IsDate()
    @ApiProperty()
        modify_timestamp: Date

    @IsOptional()
    @CanBeNull()
    @IsNumber()
    @ApiPropertyOptional({description: 'The email template used to notify users about password reset'})
        passreset_email_template_id?: number

    @IsNumber()
    @IsOptional()
    @ApiPropertyOptional()
        profile_package_id?: number

    @IsNotEmpty()
    @IsEnum(CustomerStatus)
    @ApiProperty({description: 'The status of the contract'})
        status: CustomerStatus

    @IsOptional()
    @CanBeNull()
    @IsNumber()
    @ApiPropertyOptional()
        subscriber_email_template_id?: number

    @IsOptional()
    @IsNotEmpty()
    @IsEnum(CustomerType)
    @ApiPropertyOptional({description: 'The type of contract'})
        type: CustomerType

    @DateTimeField()
    @CanBeNull()
    @IsDate()
    @ApiProperty()
        terminate_timestamp: Date

    @IsDecimal()
    @ApiProperty({description: 'VAT rate, e.g., 0.19000000000000'})
        vat_rate?: number

    @IsArray()
    @ValidateNested({each: true})
    @Type(() => CustomerBillingProfileResponseDto)
    @ApiProperty({type: [CustomerBillingProfileResponseDto], description: 'Billing profile schedule'})
        billing_profiles: CustomerBillingProfileResponseDto[]

    @IsArray()
    @ValidateNested({each: true})
    @Type(() => CustomerBillingProfileResponseDto)
    @ApiProperty({type: [CustomerBillingProfileResponseDto], description: 'Billing profiles of the schedule that start in the future'})
        future_billing_profiles: CustomerBillingProfileResponseDto[]

    constructor(entity: internal.Customer, options?: ResponseDtoOptions) {
        super(options)
        if (!entity) return

        this.id = entity.id
        this.activate_timestamp = entity.activateTimestamp
        this.add_vat = entity.addVat
        this.billing_profiles = lazyArray(
            entity.billingProfiles?.map(profile => new CustomerBillingProfileResponseDto(profile)),
            entity.lazyCounts?.billingProfiles,
        )
        this.billing_profile_definition = entity.billingProfileDefinition
        this.billing_profile_id = entity.billingProfileId
        this.future_billing_profiles = lazyArray(
            entity.futureBillingProfiles?.map(profile => new CustomerBillingProfileResponseDto(profile)),
            entity.lazyCounts?.futureBillingProfiles,
        )
        this.contact_id = entity.contactId
        this.external_id = entity.externalId
        this.create_timestamp = entity.createTimestamp
        this.invoice_email_template_id = entity.invoiceEmailTemplateId
        this.invoice_template_id = entity.invoiceTemplateId
        this.max_subscribers = entity.maxSubscribers
        this.modify_timestamp = entity.modifyTimestamp
        this.passreset_email_template_id = entity.passresetEmailTemplateId
        this.profile_package_id = entity.profilePackageId
        this.status = entity.status
        this.subscriber_email_template_id = entity.subscriberEmailTemplateId
        this.type = entity.type
        this.terminate_timestamp = entity.terminateTimestamp
        this.vat_rate = entity.vatRate
        setOwnerTimezone(this, entity.ownerTimezone)
    }
}
