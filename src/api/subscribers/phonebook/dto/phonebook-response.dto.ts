import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class SubscriberPhonebookResponseDto extends ResponseDto {
    @IsString()
    @ApiProperty({description: 'Id of the own phonebook entry or composed id of an included "inherited" phonebook entry'})
        id: string

    @IsInt()
    @ApiProperty({description: 'Subscriber owning the entry'})
        subscriber_id: number

    @IsInt()
    @ApiProperty({description: 'Customer of the subscriber owning the entry'})
        customer_id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Full name of the entry, e.g. `John Smith`'})
        name: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Phone number or SIP URI'})
        number: string

    @IsBoolean()
    @ApiProperty({description: 'Entry is visible to the other subscribers of the customer'})
        shared: boolean

    @IsOptional()
    @IsBoolean()
    @ApiPropertyOptional({description: 'Entry belongs to the subscriber, not to its customer or reseller'})
        own?: boolean

    constructor(entity: internal.SubscriberPhonebook | internal.VSubscriberPhonebook, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id.toString()
        this.subscriber_id = entity.subscriberId
        this.customer_id = entity.customerId
        this.name = entity.name
        this.number = entity.number
        this.shared = entity.shared
        if (entity instanceof internal.VSubscriberPhonebook)
            this.own = entity.own
    }
}