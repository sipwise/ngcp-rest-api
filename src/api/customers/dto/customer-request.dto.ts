import {
    ApiProperty,
    ApiPropertyOptional,
} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {
    IsBoolean,
    IsEnum,
    IsIn,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    ValidateIf,
    ValidateNested,
} from 'class-validator'

import {CustomerBillingProfileRequestDto} from './customer-billing-profile-request.dto'

import {IsBillingProfileDefinitionValid} from '~/decorators/is-valid-customer-billing-profile-definition'
import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'
import {
    ContractBillingProfileDefinition,
    ContractStatus as CustomerStatus,
} from '~/entities/internal/contract.internal.entity'
import {CustomerType} from '~/entities/internal/customer.internal.entity'

const allowedCustomerStatuses = Object.values(CustomerStatus).filter(
    status => status !== CustomerStatus.Terminated,
)

export class CustomerRequestDto implements RequestDto {
    @IsOptional()
    @ApiPropertyOptional()
        activate_timestamp?: string

    @IsOptional()
    @IsBoolean()
    @ApiPropertyOptional({default: false})
        add_vat?: boolean = false

    @ValidateIf(o => o.billing_profile_definition === ContractBillingProfileDefinition.ID || !o.billing_profile_definition)
    @IsNumber()
    @IsOptional()
    @ApiPropertyOptional({
        description:
            'The billing profile id used to charge this contract, required if billing_profile_definition is undefined or "id".',
    })
        billing_profile_id?: number

    @IsNumber()
    @ApiProperty({description: 'The contact id this contract belongs to'})
        contact_id: number

    @IsOptional()
    @IsString()
    @ApiPropertyOptional({description: 'A non-unique external ID e.g., provided by a 3rd party provisioning'})
        external_id?: string

    @IsOptional()
    @IsNumber()
    @ApiPropertyOptional()
        invoice_email_template_id?: number

    @IsOptional()
    @IsNumber()
    @ApiPropertyOptional()
        invoice_template_id?: number

    @IsOptional()
    @IsNumber()
    @ApiPropertyOptional()
        max_subscribers?: number

    @IsOptional()
    @IsNumber()
    @ApiPropertyOptional({description: 'The email template used to notify users about password reset'})
        passreset_email_template_id?: number

    @ValidateIf(o => o.billing_profile_definition === ContractBillingProfileDefinition.Package)
    @IsNumber()
    @IsOptional()
    @ApiPropertyOptional()
        profile_package_id?: number

    @IsNotEmpty()
    @IsIn(allowedCustomerStatuses)
    @ApiProperty({description: 'The status of the contract', enum: allowedCustomerStatuses})
        status: CustomerStatus

    @IsOptional()
    @IsNumber()
    @ApiPropertyOptional()
        subscriber_email_template_id?: number

    @IsNotEmpty()
    @IsEnum(CustomerType)
    @ApiProperty({description: 'The type of contract'})
        type: CustomerType

    @IsOptional()
    @IsNumber({maxDecimalPlaces: 14})
    @ApiPropertyOptional({description: 'VAT rate, e.g., 0.19000000000000'})
        vat_rate?: number

    @IsOptional()
    @IsEnum(ContractBillingProfileDefinition)
    @IsBillingProfileDefinitionValid({
        message:
            'Only one of billing_profile_id, profile_package_id, or billing_profiles must be set based on billing_profile_definition.',
    })
    @ApiPropertyOptional({description: 'Defines which billing profile field is used (id, profiles, package)'})
        billing_profile_definition?: ContractBillingProfileDefinition

    @ValidateIf(o => o.billing_profile_definition === ContractBillingProfileDefinition.Profiles)
    @IsOptional()
    @ValidateNested({each: true})
    @Type(() => CustomerBillingProfileRequestDto)
    @ApiPropertyOptional({type: [CustomerBillingProfileRequestDto]})
        billing_profiles?: CustomerBillingProfileRequestDto[]

    constructor(entity?: internal.Customer) {
        if (!entity) return
        this.add_vat = entity.addVat
        this.billing_profile_id = entity.billingProfileId
        this.contact_id = entity.contactId
        this.external_id = entity.externalId
        this.invoice_email_template_id = entity.invoiceEmailTemplateId
        this.invoice_template_id = entity.invoiceTemplateId
        this.max_subscribers = entity.maxSubscribers
        this.passreset_email_template_id = entity.passresetEmailTemplateId
        this.profile_package_id = entity.profilePackageId
        this.status = entity.status
        this.subscriber_email_template_id = entity.subscriberEmailTemplateId
        this.type = entity.type
        this.vat_rate = entity.vatRate
    }

    toInternal(options: RequestDtoOptions = {}): internal.Customer {
        const customer = internal.Customer.create({
            addVat: this.add_vat ?? false,
            billingProfileId: this.billing_profile_id,
            billingProfiles: this.billing_profiles?.map(b => b.toInternal()),
            contactId: this.contact_id,
            externalId: this.external_id,
            invoiceEmailTemplateId: this.invoice_email_template_id,
            invoiceTemplateId: this.invoice_template_id,
            maxSubscribers: this.max_subscribers,
            passresetEmailTemplateId: this.passreset_email_template_id,
            profilePackageId: this.profile_package_id,
            status: this.status,
            subscriberEmailTemplateId: this.subscriber_email_template_id,
            type: this.type,
            vatRate: this.vat_rate ?? 0,
            billingProfileDefinition: this.billing_profile_definition,
        })

        if (options.id) {
            customer.id = options.id
        }

        if (options.assignNulls) {
            Object.keys(customer).forEach(k => {
                if (customer[k] === undefined) customer[k] = null
            })
        }

        return customer
    }
}