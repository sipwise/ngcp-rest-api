import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min} from 'class-validator'

import {eventDescriptions} from './event-descriptions'

import {IsByDay, IsByList, IsDuration, weekdays} from '~/api/time-sets/events/event-rules'
import {LocalDateTimeField} from '~/decorators/date-time-field.decorator'
import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'
import {TimeSetEventFreq} from '~/entities/internal/time-set-event.internal.entity'

export class TimeSetEventEmbeddedRequestDto implements RequestDto {
    @LocalDateTimeField()
    @ApiProperty({description: eventDescriptions.start})
    @IsNotEmpty()
        start!: Date

    @LocalDateTimeField()
    @ApiPropertyOptional({description: eventDescriptions.end})
    @IsOptional()
        end?: Date

    @ApiPropertyOptional({description: eventDescriptions.duration, example: 'PT2H30M'})
    @IsOptional()
    @IsString()
    @MaxLength(45)
    @IsDuration()
        duration?: string

    @ApiPropertyOptional({description: eventDescriptions.freq, enum: TimeSetEventFreq})
    @IsOptional()
    @IsEnum(TimeSetEventFreq)
        freq?: TimeSetEventFreq

    @ApiPropertyOptional({description: eventDescriptions.interval})
    @IsOptional()
    @IsInt()
    @Min(1)
        interval?: number

    @LocalDateTimeField()
    @ApiPropertyOptional({description: eventDescriptions.until})
    @IsOptional()
        until?: Date

    @ApiPropertyOptional({description: eventDescriptions.count})
    @IsOptional()
    @IsInt()
    @Min(1)
        count?: number

    @ApiPropertyOptional({description: eventDescriptions.bysecond, example: '0,30'})
    @IsOptional()
    @IsString()
    @MaxLength(45)
    @IsByList({min: 0, max: 59})
        bysecond?: string

    @ApiPropertyOptional({description: eventDescriptions.byminute, example: '0,30'})
    @IsOptional()
    @IsString()
    @MaxLength(45)
    @IsByList({min: 0, max: 59})
        byminute?: string

    @ApiPropertyOptional({description: eventDescriptions.byhour, example: '9,17'})
    @IsOptional()
    @IsString()
    @MaxLength(45)
    @IsByList({min: 0, max: 23})
        byhour?: string

    @ApiPropertyOptional({description: eventDescriptions.byday, example: 'MO,TU,-1FR'})
    @IsOptional()
    @IsString()
    @MaxLength(45)
    @IsByDay()
        byday?: string

    @ApiPropertyOptional({description: eventDescriptions.bymonthday, example: '1,15,-1'})
    @IsOptional()
    @IsString()
    @MaxLength(45)
    @IsByList({min: 1, max: 31, signed: true})
        bymonthday?: string

    @ApiPropertyOptional({description: eventDescriptions.byyearday, example: '1,100,-1'})
    @IsOptional()
    @IsString()
    @MaxLength(45)
    @IsByList({min: 1, max: 366, signed: true})
        byyearday?: string

    @ApiPropertyOptional({description: eventDescriptions.byweekno, example: '1,26,-1'})
    @IsOptional()
    @IsString()
    @MaxLength(45)
    @IsByList({min: 1, max: 53, signed: true})
        byweekno?: string

    @ApiPropertyOptional({description: eventDescriptions.bymonth, example: '1,7'})
    @IsOptional()
    @IsString()
    @MaxLength(45)
    @IsByList({min: 1, max: 12})
        bymonth?: string

    @ApiPropertyOptional({description: eventDescriptions.bysetpos, example: '1,-1'})
    @IsOptional()
    @IsString()
    @MaxLength(45)
    @IsByList({min: 1, max: 366, signed: true})
        bysetpos?: string

    @ApiPropertyOptional({description: eventDescriptions.wkst, enum: weekdays})
    @IsOptional()
    @IsIn(weekdays)
        wkst?: string

    @ApiPropertyOptional({description: eventDescriptions.comment})
    @IsOptional()
    @IsString()
        comment?: string

    constructor(entity?: internal.TimeSetEvent) {
        if (!entity)
            return
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

    toInternal(options: RequestDtoOptions = {}): internal.TimeSetEvent {
        const entity = new internal.TimeSetEvent()
        entity.timeSetId = options.parentId
        entity.start = this.start
        entity.end = this.end
        entity.duration = this.duration
        entity.freq = this.freq
        entity.interval = this.interval
        entity.until = this.until
        entity.count = this.count
        entity.bysecond = this.bysecond
        entity.byminute = this.byminute
        entity.byhour = this.byhour
        entity.byday = this.byday
        entity.bymonthday = this.bymonthday
        entity.byyearday = this.byyearday
        entity.byweekno = this.byweekno
        entity.bymonth = this.bymonth
        entity.bysetpos = this.bysetpos
        entity.wkst = this.wkst
        entity.comment = this.comment

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
