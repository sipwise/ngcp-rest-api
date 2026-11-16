import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsDate, IsNumber} from 'class-validator'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {LocalDateTimeField} from '~/decorators/date-time-field.decorator'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class CustomerBillingProfileResponseDto {
    @LocalDateTimeField()
    @ApiProperty({description: 'Effective start time of the profile mapping'})
    @CanBeNull()
    @IsDate()
        effective_start_time: Date | null

    @ApiPropertyOptional()
    @CanBeNull()
    @IsNumber()
        network_id?: number

    @ApiProperty()
    @IsNumber()
        profile_id: number

    @LocalDateTimeField()
    @ApiPropertyOptional()
    @CanBeNull()
    @IsDate()
        start?: Date

    @LocalDateTimeField()
    @ApiPropertyOptional()
    @IsDate()
    @CanBeNull()
        stop?: Date

    constructor(entity: internal.CustomerBillingProfile, _options?: ResponseDtoOptions) {
        if (!entity) return

        this.effective_start_time = entity.effectiveStartTime ? new Date(entity.effectiveStartTime) : null
        this.network_id = entity.networkId
        this.profile_id = entity.id
        this.start = entity.startDate
        this.stop = entity.endDate
    }
}
