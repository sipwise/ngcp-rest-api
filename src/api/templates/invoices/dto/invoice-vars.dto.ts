import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'

/**
 * Variables available to invoice templates ([% var.field %] substitutions).
 *
 * Field values are example values, the real values are resolved per invoice when an
 * invoice is generated. All fields are initialised, as the field names are used by the
 * template validator to detect unknown variables.
 */

export class InvoiceTemplateContactVars {
    @ApiProperty({example: 1})
        id: number = 1
    @ApiPropertyOptional({example: 1, nullable: true})
        reseller_id: number | null = 1
    @ApiPropertyOptional({example: 'male', nullable: true})
        gender: string | null = 'male'
    @ApiPropertyOptional({example: 'Resellerfirst', nullable: true})
        firstname: string | null = 'Resellerfirst'
    @ApiPropertyOptional({example: 'Resellerlast', nullable: true})
        lastname: string | null = 'Resellerlast'
    @ApiPropertyOptional({example: 'COMREG1234567890', nullable: true})
        comregnum: string | null = 'COMREG1234567890'
    @ApiPropertyOptional({example: 'Resellercompany Inc.', nullable: true})
        company: string | null = 'Resellercompany Inc.'
    @ApiPropertyOptional({example: 'Resellerstreet 12/3', nullable: true})
        street: string | null = 'Resellerstreet 12/3'
    @ApiPropertyOptional({example: '12345', nullable: true})
        postcode: string | null = '12345'
    @ApiPropertyOptional({example: 'Resellercity', nullable: true})
        city: string | null = 'Resellercity'
    @ApiPropertyOptional({example: 'Austria', nullable: true})
        country: string | null = 'Austria'
    @ApiPropertyOptional({example: '+1234567890', nullable: true})
        phonenumber: string | null = '+1234567890'
    @ApiPropertyOptional({example: '+2234567890', nullable: true})
        mobilenumber: string | null = '+2234567890'
    @ApiPropertyOptional({example: 'reseller@example.org', nullable: true})
        email: string | null = 'reseller@example.org'
    @ApiPropertyOptional({example: '+3234567890', nullable: true})
        faxnumber: string | null = '+3234567890'
    @ApiPropertyOptional({example: 'RESIBAN1234567890', nullable: true})
        iban: string | null = 'RESIBAN1234567890'
    @ApiPropertyOptional({example: 'RESBIC1234567890', nullable: true})
        bic: string | null = 'RESBIC1234567890'
    @ApiPropertyOptional({example: 'RESVAT1234567890', nullable: true})
        vatnum: string | null = 'RESVAT1234567890'
    @ApiPropertyOptional({example: 'Resellerbank', nullable: true})
        bankname: string | null = 'Resellerbank'
    @ApiPropertyOptional({example: 'RESGPP0', nullable: true})
        gpp0: string | null = 'RESGPP0'
    @ApiPropertyOptional({example: 'RESGPP1', nullable: true})
        gpp1: string | null = 'RESGPP1'
    @ApiPropertyOptional({example: 'RESGPP2', nullable: true})
        gpp2: string | null = 'RESGPP2'
    @ApiPropertyOptional({example: 'RESGPP3', nullable: true})
        gpp3: string | null = 'RESGPP3'
    @ApiPropertyOptional({example: 'RESGPP4', nullable: true})
        gpp4: string | null = 'RESGPP4'
    @ApiPropertyOptional({example: 'RESGPP5', nullable: true})
        gpp5: string | null = 'RESGPP5'
    @ApiPropertyOptional({example: 'RESGPP6', nullable: true})
        gpp6: string | null = 'RESGPP6'
    @ApiPropertyOptional({example: 'RESGPP7', nullable: true})
        gpp7: string | null = 'RESGPP7'
    @ApiPropertyOptional({example: 'RESGPP8', nullable: true})
        gpp8: string | null = 'RESGPP8'
    @ApiPropertyOptional({example: 'RESGPP9', nullable: true})
        gpp9: string | null = 'RESGPP9'
    @ApiPropertyOptional({example: 'Europe/Vienna', nullable: true})
        timezone: string | null = 'Europe/Vienna'

    constructor(values?: Partial<InvoiceTemplateContactVars>) {
        Object.assign(this, values)
    }
}

export class InvoiceTemplateCustomerVars {
    @ApiProperty({example: 10001})
        id: number = 10001
    @ApiPropertyOptional({example: 'Resext1234567890', nullable: true})
        external_id: string | null = 'Resext1234567890'
    @ApiProperty({example: 20})
        vat_rate: number = 20

    constructor(values?: Partial<InvoiceTemplateCustomerVars>) {
        Object.assign(this, values)
    }
}

export class InvoiceTemplateBillingProfileVars {
    @ApiProperty({example: 1})
        id: number = 1
    @ApiProperty({example: 'BILPROF12345'})
        handle: string = 'BILPROF12345'
    @ApiProperty({example: 'Test Billing Profile'})
        name: string = 'Test Billing Profile'
    @ApiProperty({example: false})
        prepaid: boolean = false
    @ApiProperty({example: 2990})
        interval_charge: number = 2990
    @ApiProperty({example: 2000})
        interval_free_time: number = 2000
    @ApiProperty({example: 0})
        interval_free_cash: number = 0
    @ApiProperty({example: 'month'})
        interval_unit: string = 'month'
    @ApiProperty({example: 1})
        interval_count: number = 1
    @ApiPropertyOptional({example: 'EUR', nullable: true})
        currency: string | null = 'EUR'

    constructor(values?: Partial<InvoiceTemplateBillingProfileVars>) {
        Object.assign(this, values)
    }
}

export class InvoiceTemplateInvoiceVars {
    @ApiProperty({description: 'Invoice period start (DateTime)', example: '2026-09-01T00:00:00.000Z'})
        period_start: string = '2026-09-01T00:00:00.000Z'
    @ApiProperty({description: 'Invoice period end (DateTime)', example: '2026-09-30T23:59:59.000Z'})
        period_end: string = '2026-09-30T23:59:59.000Z'
    @ApiProperty({example: 'INV2026090000001'})
        serial: string = 'INV2026090000001'
    @ApiProperty({example: 6000})
        amount_net: number = 6000
    @ApiProperty({example: 0})
        amount_vat: number = 0
    @ApiProperty({example: 6000})
        amount_total: number = 6000
    @ApiProperty({description: 'Derived from the template call_direction', enum: ['from', 'to', 'from/to'], example: 'to'})
        call_direction: string = 'to'

    constructor(values?: Partial<InvoiceTemplateInvoiceVars>) {
        Object.assign(this, values)
    }
}

// list data consumed by the layout markers, not available as substitutions
export class InvoiceTemplateZoneVars {
    @ApiProperty({example: 'Zone 1'})
        zone: string = 'Zone 1'
    @ApiProperty({example: 'Detail 1'})
        zone_detail: string = 'Detail 1'
    @ApiProperty({description: 'Customer cost in cents', example: 12345})
        customercost: number = 12345
    @ApiPropertyOptional({description: 'Reseller cost in cents (admin and reseller users only)', example: 10000})
        resellercost?: number = 10000
    @ApiPropertyOptional({description: 'Carrier cost in cents (admin users only)', example: 8000})
        carriercost?: number = 8000
    @ApiProperty({description: 'Duration in seconds', example: 3600})
        duration: number = 3600
    @ApiProperty({description: 'Free time in seconds', example: 0})
        free_time: number = 0
    @ApiProperty({description: 'Number of calls', example: 42})
        number: number = 42

    constructor(values?: Partial<InvoiceTemplateZoneVars>) {
        Object.assign(this, values)
    }
}

export class InvoiceTemplateZonesVars {
    @ApiProperty({example: 12345})
        totalcost: number = 12345
    @ApiProperty({example: 3600})
        totalduration: number = 3600
    @ApiProperty({type: [InvoiceTemplateZoneVars]})
        data: InvoiceTemplateZoneVars[] = [new InvoiceTemplateZoneVars()]

    constructor(values?: Partial<InvoiceTemplateZonesVars>) {
        Object.assign(this, values)
    }
}

export class InvoiceTemplateCallVars {
    @ApiProperty({example: 'user'})
        source_user: string = 'user'
    @ApiProperty({example: 'example.org'})
        source_domain: string = 'example.org'
    @ApiProperty({example: '1234567890'})
        source_cli: string = '1234567890'
    @ApiProperty({example: '111234567890'})
        destination_user_in: string = '111234567890'
    @ApiProperty({description: 'Unix timestamp', example: 1788220800})
        start_time: number = 1788220800
    @ApiProperty({description: 'Duration in seconds', example: 120})
        duration: number = 120
    @ApiProperty({example: 'call'})
        call_type: string = 'call'
    @ApiProperty({description: 'Call cost in cents (category specific)', example: 25})
        cost: number = 25
    @ApiProperty({example: 'Zone 1'})
        zone: string = 'Zone 1'
    @ApiProperty({example: 'Detail 1'})
        zone_detail: string = 'Detail 1'

    constructor(values?: Partial<InvoiceTemplateCallVars>) {
        Object.assign(this, values)
    }
}

export class InvoiceTemplateDidZoneVars {
    @ApiProperty({example: 12345})
        totalcost: number = 12345
    @ApiProperty({example: 3600})
        totalduration: number = 3600
    @ApiProperty({type: [InvoiceTemplateZoneVars]})
        data: InvoiceTemplateZoneVars[] = [new InvoiceTemplateZoneVars()]

    constructor(values?: Partial<InvoiceTemplateDidZoneVars>) {
        Object.assign(this, values)
    }
}
