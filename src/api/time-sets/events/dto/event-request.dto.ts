import {ApiPropertyOptional} from '@nestjs/swagger'
import {IsInt, IsOptional, IsPositive} from 'class-validator'

import {eventDescriptions} from './event-descriptions'
import {TimeSetEventEmbeddedRequestDto} from './event-embedded-request.dto'

import {RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'

export class TimeSetEventRequestDto extends TimeSetEventEmbeddedRequestDto {
    @ApiPropertyOptional({description: `${eventDescriptions.timeSetId}; required unless the path names the time set (/time-sets/{id}/events)`})
    @IsOptional()
    @IsInt()
    @IsPositive()
        time_set_id?: number

    constructor(entity?: internal.TimeSetEvent) {
        super(entity)
        if (!entity)
            return
        this.time_set_id = entity.timeSetId
    }

    toInternal(options: RequestDtoOptions = {}): internal.TimeSetEvent {
        const entity = super.toInternal(options)
        entity.timeSetId = options.parentId ?? this.time_set_id ?? entity.timeSetId
        return entity
    }
}
