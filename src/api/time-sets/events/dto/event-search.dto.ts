import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {eventDescriptions} from './event-descriptions'

import {TimeSetEventFreq} from '~/entities/internal/time-set-event.internal.entity'

export class TimeSetEventSearchDto {
    @ApiPropertyOptional({description: eventDescriptions.id})
        id: number
    @ApiPropertyOptional({description: eventDescriptions.timeSetId})
        time_set_id: number
    @ApiPropertyOptional({description: eventDescriptions.freq, enum: TimeSetEventFreq})
        freq: TimeSetEventFreq
    @ApiPropertyOptional({description: eventDescriptions.comment})
        comment: string
    @ApiHideProperty()
        _alias = {
            id: 'event.id',
        }
}
