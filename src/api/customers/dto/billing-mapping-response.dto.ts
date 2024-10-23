import {ApiProperty} from '@nestjs/swagger'
import {internal} from '~/entities'

export class BillingMappingResponseDto {
    @ApiProperty()
        effective_start_time: number

    @ApiProperty()
        network_id: number

    @ApiProperty()
        profile_id: number

    @ApiProperty()
        start: Date

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
