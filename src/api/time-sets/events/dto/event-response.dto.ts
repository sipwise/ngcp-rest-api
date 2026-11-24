import {ApiProperty} from '@nestjs/swagger'
import {IsDate, IsEnum, IsInt, IsString} from 'class-validator'

import {eventDescriptions} from './event-descriptions'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {LocalDateTimeField} from '~/decorators/date-time-field.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {TimeSetEventFreq} from '~/entities/internal/time-set-event.internal.entity'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class TimeSetEventResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty({description: eventDescriptions.id})
        id!: number

    @IsInt()
    @ApiProperty({description: eventDescriptions.timeSetId})
        time_set_id!: number

    @LocalDateTimeField()
    @IsDate()
    @ApiProperty({description: eventDescriptions.start})
        start!: Date

    @LocalDateTimeField()
    @CanBeNull()
    @IsDate()
    @ApiProperty({description: eventDescriptions.end})
        end?: Date

    @CanBeNull()
    @IsString()
    @ApiProperty({description: eventDescriptions.duration})
        duration?: string

    @CanBeNull()
    @IsEnum(TimeSetEventFreq)
    @ApiProperty({description: eventDescriptions.freq, enum: TimeSetEventFreq})
        freq?: TimeSetEventFreq

    @CanBeNull()
    @IsInt()
    @ApiProperty({description: eventDescriptions.interval})
        interval?: number

    @LocalDateTimeField()
    @CanBeNull()
    @IsDate()
    @ApiProperty({description: eventDescriptions.until})
        until?: Date

    @CanBeNull()
    @IsInt()
    @ApiProperty({description: eventDescriptions.count})
        count?: number

    @CanBeNull()
    @IsString()
    @ApiProperty({description: eventDescriptions.bysecond})
        bysecond?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: eventDescriptions.byminute})
        byminute?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: eventDescriptions.byhour})
        byhour?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: eventDescriptions.byday})
        byday?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: eventDescriptions.bymonthday})
        bymonthday?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: eventDescriptions.byyearday})
        byyearday?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: eventDescriptions.byweekno})
        byweekno?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: eventDescriptions.bymonth})
        bymonth?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: eventDescriptions.bysetpos})
        bysetpos?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: eventDescriptions.wkst})
        wkst?: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: eventDescriptions.comment})
        comment?: string

    constructor(entity: internal.TimeSetEvent, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id
        this.time_set_id = entity.timeSetId
        this.start = entity.start
        this.end = entity.end
        this.duration = entity.duration
        this.freq = entity.freq
        this.interval = entity.interval
        this.until = entity.until
        this.count = entity.count
        this.bysecond = entity.bysecond
        this.byminute = entity.byminute
        this.byhour = entity.byhour
        this.byday = entity.byday
        this.bymonthday = entity.bymonthday
        this.byyearday = entity.byyearday
        this.byweekno = entity.byweekno
        this.bymonth = entity.bymonth
        this.bysetpos = entity.bysetpos
        this.wkst = entity.wkst
        this.comment = entity.comment
    }
}
