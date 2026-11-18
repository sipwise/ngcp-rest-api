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
    @ApiPropertyOptional({description: 'Activation time, ignored on input'})
        activate_timestamp?: string

    @IsOptional()
    @IsBoolean()
    @ApiPropertyOptional({description: 'VAT is added on invoices', default: false})
        add_vat?: boolean = false

    @ValidateIf(o => o.billing_profile_definition === ContractBillingProfileDefinition.ID || !o.billing_profile_definition)
    @IsNumber()
    @IsOptional()
    @ApiPropertyOptional({
        description: 'Billing profile charging the customer, active immediately; required for billing_profile_definition `id`',
    })
        billing_profile_id?: number

    @IsNumber()
    @ApiProperty({description: 'Contact of the customer'})
        contact_id: number

    @IsOptional()
    @IsString()
    @ApiPropertyOptional({description: 'Non-unique external id, e.g. from third-party provisioning'})
        external_id?: string

    @IsOptional()
    @IsNumber()
    @ApiPropertyOptional({description: 'Email template used to notify users about invoices'})
        invoice_email_template_id?: number

    @IsOptional()
    @IsNumber()
    @ApiPropertyOptional({description: 'Invoice template; null = no invoices are generated'})
        invoice_template_id?: number

    @IsOptional()
    @IsNumber()
    @ApiPropertyOptional({description: 'Maximum number of subscribers; null = unlimited'})
        max_subscribers?: number

    @IsOptional()
    @IsNumber()
    @ApiPropertyOptional({description: 'Email template used to notify users about password resets'})
        passreset_email_template_id?: number

    @ValidateIf(o => o.billing_profile_definition === ContractBillingProfileDefinition.Package)
    @IsNumber()
    @IsOptional()
    @ApiPropertyOptional({
        description: 'Profile package whose initial profiles charge the customer; required for billing_profile_definition `package`',
    })
        profile_package_id?: number

    @IsNotEmpty()
    @IsIn(allowedCustomerStatuses)
    @ApiProperty({description: 'State of the customer (DELETE sets `terminated`)', enum: allowedCustomerStatuses})
        status: CustomerStatus

    @IsOptional()
    @IsNumber()
    @ApiPropertyOptional({description: 'Email template used to notify users about subscriber creation'})
        subscriber_email_template_id?: number

    @IsNotEmpty()
    @IsEnum(CustomerType)
    @ApiProperty({description: '`sipaccount` for SIP customers, `pbxaccount` for Cloud PBX customers'})
        type: CustomerType

    @IsOptional()
    @IsNumber({maxDecimalPlaces: 14})
    @ApiPropertyOptional({description: 'VAT rate in percent, e.g. 20'})
        vat_rate?: number

    @IsOptional()
    @IsEnum(ContractBillingProfileDefinition)
    @IsBillingProfileDefinitionValid({
        message:
            'Only one of billing_profile_id, profile_package_id, or billing_profiles must be set based on billing_profile_definition.',
    })
    @ApiPropertyOptional({
        description: 'Billing profile field to use: `id` (billing_profile_id, default), `profiles` (billing_profiles) or `package` (profile_package_id)',
    })
        billing_profile_definition?: ContractBillingProfileDefinition

    @ValidateIf(o => o.billing_profile_definition === ContractBillingProfileDefinition.Profiles)
    @IsOptional()
    @ValidateNested({each: true})
    @Type(() => CustomerBillingProfileRequestDto)
    @ApiPropertyOptional({
        description: 'Billing profile schedule; required for billing_profile_definition `profiles`',
        type: [CustomerBillingProfileRequestDto],
    })
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
        const data = {
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
        }
        const customer = internal.Customer.create(data)

        if (options.id) {
            customer.id = options.id
        }

        // only the fields of the request, the others (create_timestamp, send_invoice, ...) are kept
        if (options.assignNulls) {
            Object.keys(data).forEach(k => {
                if (customer[k] === undefined) customer[k] = null
            })
        }

        return customer
    }
}