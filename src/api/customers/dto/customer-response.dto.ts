import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {
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


import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {Expandable} from '~/decorators/expandable.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ContractBillingProfileDefinition, ContractStatus as CustomerStatus} from '~/entities/internal/contract.internal.entity'
import {CustomerType} from '~/entities/internal/customer.internal.entity'
import {UrlReferenceType} from '~/enums/url-reference-type.enum'
import {ResponseDtoOptions} from '~/types/response-dto-options'
import {UrlReference} from '~/types/url-reference.type'

export class CustomerResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty()
        id: number

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

    @Expandable({name: 'contact_id', controller: 'contactController'})
    @IsNumber()
    @ApiProperty({description: 'The contact id this contract belongs to'})
        contact_id: number

    @IsOptional()
    @CanBeNull()
    @IsString()
    @ApiPropertyOptional({description: 'A non-unique external ID e.g., provided by a 3rd party provisioning'})
        external_id?: string

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

    @CanBeNull()
    @IsDate()
    @ApiProperty()
        terminate_timestamp: Date

    @IsDecimal()
    @ApiProperty({description: 'VAT rate, e.g., 0.19000000000000'})
        vat_rate?: number

    @ValidateNested({each: true})
    @Type(() => UrlReference)
    @ApiProperty()
        billing_profiles: UrlReference

    @ValidateNested({each: true})
    @Type(() => UrlReference)
    @ApiProperty()
        future_billing_profiles: UrlReference

    constructor(entity: internal.Customer, options?: ResponseDtoOptions) {
        super(options)
        if (!entity) return

        this.id = entity.id
        this.activate_timestamp = entity.activateTimestamp
        this.add_vat = entity.addVat
        this.billing_profiles = {
            type: UrlReferenceType.Link,
            url: `${this.resourceUrl}/${entity.id}/@billing-profiles`,
        }
        this.billing_profile_definition = entity.billingProfileDefinition
        this.billing_profile_id = entity.billingProfileId
        this.future_billing_profiles = {
            type: UrlReferenceType.Link,
            url: `${this.resourceUrl}/${entity.id}/@future-billing-profiles`,
        }
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
    }
}
