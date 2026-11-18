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
    @ApiProperty({description: 'Id of the customer'})
        id: number

    @DateTimeField()
    @IsOptional()
    @CanBeNull()
    @IsDate()
    @ApiPropertyOptional({description: 'Activation time'})
        activate_timestamp?: Date

    @IsOptional()
    @IsBoolean()
    @ApiPropertyOptional({description: 'VAT is added on invoices', default: false})
        add_vat?: boolean = false

    @IsOptional()
    @IsEnum(ContractBillingProfileDefinition)
    @ApiPropertyOptional({
        description: 'How the billing profiles were set: `id`, `profiles` or `package`',
        enum: ContractBillingProfileDefinition,
    })
        billing_profile_definition: ContractBillingProfileDefinition

    @IsNumber()
    @IsOptional()
    @ApiPropertyOptional({
        description: 'Billing profile currently charging the customer',
    })
        billing_profile_id?: number

    @IsNumber()
    @ApiProperty({description: 'Contact of the customer'})
        contact_id: number

    @IsOptional()
    @CanBeNull()
    @IsString()
    @ApiPropertyOptional({description: 'Non-unique external id, e.g. from third-party provisioning'})
        external_id?: string

    @DateTimeField()
    @IsDate()
    @ApiProperty({description: 'Creation time'})
        create_timestamp: Date

    @IsOptional()
    @CanBeNull()
    @IsNumber()
    @ApiPropertyOptional({description: 'Email template used to notify users about invoices'})
        invoice_email_template_id?: number

    @IsOptional()
    @CanBeNull()
    @IsNumber()
    @ApiPropertyOptional({description: 'Invoice template; null = no invoices are generated'})
        invoice_template_id?: number

    @IsOptional()
    @CanBeNull()
    @IsNumber()
    @ApiPropertyOptional({description: 'Maximum number of subscribers; null = unlimited'})
        max_subscribers?: number

    @DateTimeField()
    @IsDate()
    @ApiProperty({description: 'Time of the last modification'})
        modify_timestamp: Date

    @IsOptional()
    @CanBeNull()
    @IsNumber()
    @ApiPropertyOptional({description: 'Email template used to notify users about password resets'})
        passreset_email_template_id?: number

    @IsNumber()
    @IsOptional()
    @ApiPropertyOptional({description: 'Profile package whose initial profiles charge the customer'})
        profile_package_id?: number

    @IsNotEmpty()
    @IsEnum(CustomerStatus)
    @ApiProperty({description: 'State of the customer (DELETE sets `terminated`)'})
        status: CustomerStatus

    @IsOptional()
    @CanBeNull()
    @IsNumber()
    @ApiPropertyOptional({description: 'Email template used to notify users about subscriber creation'})
        subscriber_email_template_id?: number

    @IsOptional()
    @IsNotEmpty()
    @IsEnum(CustomerType)
    @ApiPropertyOptional({description: '`sipaccount` for SIP customers, `pbxaccount` for Cloud PBX customers'})
        type: CustomerType

    @DateTimeField()
    @CanBeNull()
    @IsDate()
    @ApiProperty({description: 'Termination time'})
        terminate_timestamp: Date

    @IsDecimal()
    @ApiProperty({description: 'VAT rate in percent, e.g. 20'})
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
