import {ApiProperty} from '@nestjs/swagger'
import {Transform} from 'class-transformer'
import {IsBoolean, IsNotEmpty, IsNumberString, IsString, MaxLength} from 'class-validator'

import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'

export class SubscriberPhonebookCsvRequestDto implements RequestDto {
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

    @IsNumberString()
    @ApiProperty({description: 'Subscriber owning the entry'})
        subscriber_id: number

    @Transform(({value}) => {
        if (typeof value === 'string') {
            return value.toLowerCase() === 'true' || value === '1'
        }

        if (typeof value === 'boolean')
            return value

        return false
    })
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
        entity.subscriberId = this.subscriber_id
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
