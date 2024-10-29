import {ApiProperty} from '@nestjs/swagger'

import {BillingMappingResponseDto} from './billing-mapping-response.dto'

import {Expandable} from '~/decorators/expandable.decorator'
import {internal} from '~/entities'
import {BillingMapping} from '~/entities/internal'
import {
    ContractStatus as CustomerStatus,
} from '~/entities/internal/contract.internal.entity'
import {CustomerType} from '~/entities/internal/customer.internal.entity'

export class CustomerResponseDto {
    @ApiProperty()
        add_vat: boolean

    @ApiProperty()
        all_billing_profiles: BillingMappingResponseDto[]

    @ApiProperty()
        billing_profiles: BillingMapping[]

    @ApiProperty()
        billing_profile_id: number

    @ApiProperty({description: 'The contact id this contract belongs to'})
    @Expandable({name:'contact_id', controller: 'contactController'})
        contact_id?: number

    @ApiProperty()
        create_timestamp: Date

    @ApiProperty({description: 'A non-unique external ID e.g., provided by a 3rd party provisioning'})
        external_id: string

    @ApiProperty({description: 'Unique identifier of the contract'})
        id: number

    @ApiProperty()
        invoice_email_template_id: number

    @ApiProperty()
        invoice_template_id: number

    @ApiProperty()
        max_subscribers: number

    @ApiProperty()
        modify_timestamp: Date

    @ApiProperty()
        passreset_email_template_id: number

    @ApiProperty()
        profile_package_id: number

    @ApiProperty({description: 'The status of the contract'})
        status: CustomerStatus

    @ApiProperty()
        subscriber_email_template_id: number

    @ApiProperty()
        terminate_timestamp: Date

    @ApiProperty({description: 'The type of contract'})
        type?: CustomerType

    @ApiProperty()
        vat_rate: number

    constructor(data: internal.Customer) {
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
