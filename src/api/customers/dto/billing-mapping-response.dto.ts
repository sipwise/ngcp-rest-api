import {ApiProperty} from '@nestjs/swagger'
import {IsDate, IsInt, IsNumber} from 'class-validator'

import {internal} from '~/entities'

export class BillingMappingResponseDto {
    @IsNumber()
    @ApiProperty()
        effective_start_time: number

    @IsInt()
    @ApiProperty()
        network_id: number

    @IsInt()
    @ApiProperty()
        profile_id: number

    @IsDate()
    @ApiProperty()
        start: Date

    @IsDate()
    @ApiProperty()
        stop: Date

    constructor(mapping: internal.BillingMapping) {
        this.effective_start_time = mapping.effectiveStartTime
        this.network_id = mapping.networkId
        this.profile_id = mapping.billingProfileId
        this.start = mapping.startDate
        this.stop = mapping.endDate
    }
}
