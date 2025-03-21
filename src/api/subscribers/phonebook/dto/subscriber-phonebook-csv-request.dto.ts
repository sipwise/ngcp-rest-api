import {ApiProperty} from '@nestjs/swagger'
import {Transform} from 'class-transformer'
import {IsBoolean, IsNotEmpty, IsNumberString, IsString, MaxLength} from 'class-validator'

import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'

export class SubscriberPhonebookCsvRequestDto implements RequestDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    @ApiProperty()
        name: string

    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    @ApiProperty()
        number: string

    @IsNumberString()
    @ApiProperty()
        subscriber_id: number

    @Transform(({value}) => value !== '0')
    @IsBoolean()
    @ApiProperty()
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
