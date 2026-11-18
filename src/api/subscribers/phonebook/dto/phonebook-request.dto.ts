import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength} from 'class-validator'

import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'

export class SubscriberPhonebookRequestDto implements RequestDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    @ApiProperty({description: 'Full name of the entry, e.g. `John Smith`'})
        name: string

    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    @ApiProperty({description: 'Phone number or SIP URI'})
        number: string

    @IsInt()
    @IsOptional()
    @ApiPropertyOptional({description: 'Subscriber owning the entry'})
        subscriber_id: number

    @IsBoolean()
    @ApiProperty({description: 'Entry is visible to the other subscribers of the customer'})
        shared: boolean

    constructor(entity?: internal.SubscriberPhonebook) {
        if (!entity)
            return

        this.name = entity.name
        this.number = entity.number
        this.subscriber_id = entity.subscriberId
        this.shared = entity.shared
    }

    toInternal(options: RequestDtoOptions = {}): internal.SubscriberPhonebook {
        const entity = new internal.SubscriberPhonebook()
        entity.name = this.name
        entity.subscriberId = this.subscriber_id || options.parentId
        entity.number = this.number
        entity.shared = this.shared

        if (options.id)
            entity.id = options.id

        if (options.assignNulls) {
            Object.keys(entity).forEach(k => {
                if (entity[k] === undefined)
                    entity[k] = null
            })
        }
        return entity
    }
}
