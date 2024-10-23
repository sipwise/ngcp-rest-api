import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsEnum, IsNotEmpty, IsNumber, IsOptional} from 'class-validator'
import {
    ContractStatus as CustomerStatus,
} from '~/entities/internal/contract.internal.entity'
import {internal} from '~/entities'
import {CustomerType} from '~/entities/internal/customer.internal.entity'
import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'

export class CustomerRequestDto implements RequestDto{

    @IsOptional()
    @ApiPropertyOptional()
        activate_timestamp?: string

    @IsOptional()
    @ApiPropertyOptional()
        add_vat: boolean


    @IsNumber()
    @IsOptional()
    @ApiPropertyOptional({
        description: 'The billing profile id used to charge this contract, which will become active immediately. ' +
            'This field is required if the profile definition mode is not defined or the "id" mode is used.',
    })
        billing_profile_id?: number

    @IsNumber()
    @ApiProperty({description: 'The contact id this contract belongs to'})
        contact_id: number

    @IsOptional()
    @ApiPropertyOptional({description: 'A non-unique external ID e.g., provided by a 3rd party provisioning'})
        external_id?: string

    @IsOptional()
    @ApiPropertyOptional()
        invoice_email_template_id?: number

    @IsOptional()
    @ApiPropertyOptional()
        invoice_template_id?: number

    @IsOptional()
    @ApiPropertyOptional()
        max_subscribers?: number

   @IsOptional()
   @ApiPropertyOptional({description: 'The email template used to notify users about password reset'})
       passreset_email_template_id?: number

    @IsOptional()
    @ApiPropertyOptional()
        profile_package_id?: number

    @IsNotEmpty()
    @IsEnum(CustomerStatus)
    @ApiProperty({description: 'The status of the contract'})
        status: CustomerStatus

    @IsOptional()
    @ApiPropertyOptional()
        subscriber_email_template_id?: number

    @IsNotEmpty()
    @IsEnum(CustomerType)
    @ApiProperty({description: 'The type of contract'})
        type: CustomerType

    @IsOptional()
    @ApiPropertyOptional()
        vat_rate?: number

    constructor(entity?: internal.Customer) {
        if (!entity) {
            return
        }
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
            addVat: this.add_vat,
            billingProfileId: this.billing_profile_id,
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
            vatRate: this.vat_rate,
        })
        if (options.id)
            customer.id = options.id

        if (options.assignNulls) {
            Object.keys(customer).forEach(k => {
                if (customer[k] === undefined)
                    customer[k] = null
            })
        }
        return customer
    }


}


