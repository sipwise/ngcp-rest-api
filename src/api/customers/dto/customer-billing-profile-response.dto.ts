import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsDate, IsNumber} from 'class-validator'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class CustomerBillingProfileResponseDto {
    @ApiProperty({description: 'Effective start time (ISO string or "0.000")'})
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

    @ApiPropertyOptional()
    @CanBeNull()
    @IsDate()
        start?: Date

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
