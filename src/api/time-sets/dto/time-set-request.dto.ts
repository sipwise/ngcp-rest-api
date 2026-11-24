import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {Transform, Type} from 'class-transformer'
import {IsArray, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength, ValidateNested} from 'class-validator'

import {TimeSetEventEmbeddedRequestDto} from '~/api/time-sets/events/dto/event-embedded-request.dto'
import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'

export class TimeSetRequestDto implements RequestDto {
    @ApiPropertyOptional({
        description: 'Reseller of the time set; required for admin roles, the own reseller for reseller roles',
        example: 1,
    })
    @IsOptional()
    @IsPositive()
    @IsInt()
    @Transform(({value}: {value: unknown}): unknown => typeof value == 'string' && value != '' && !isNaN(+value) ? +value : value)
        reseller_id?: number

    @ApiProperty({description: 'Name of the time set, unique across all resellers', example: 'Office hours'})
    @IsString()
    @IsNotEmpty()
    @MaxLength(90)
        name!: string

    @ApiPropertyOptional({
        description: 'Calendar file (.ics, `text/calendar` or `application/octet-stream`) with the events of the time set,' +
            ' instead of `events`; multipart/form-data only. Times are converted to the time zone of the platform',
        type: 'string',
        format: 'binary',
    })
    @IsOptional()
        file?: string

    @ApiPropertyOptional({description: 'Events of the time set; PUT replaces all existing events with these', example: []})
    @IsOptional()
    @IsArray()
    @ValidateNested({each: true})
    @Type(() => TimeSetEventEmbeddedRequestDto)
        events?: TimeSetEventEmbeddedRequestDto[]

    constructor(entity?: internal.TimeSet) {
        if (!entity)
            return
        this.reseller_id = entity.resellerId
        this.name = entity.name
    }

    toInternal(options: RequestDtoOptions = {}): internal.TimeSet {
        const entity = new internal.TimeSet()
        entity.resellerId = this.reseller_id
        entity.name = this.name

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
