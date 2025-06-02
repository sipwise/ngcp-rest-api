import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsDate, IsNumber} from 'class-validator'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class CustomerBillingProfileRequestDto {
    @ApiProperty()
    @IsNumber()
        profile_id: number

    @ApiPropertyOptional()
    @CanBeNull()
    @IsNumber()
        network_id?: number

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
        this.profile_id = entity.id
        this.network_id = entity.networkId
        this.start = entity.startDate
        this.stop = entity.endDate
    }

    toInternal(_options: RequestDtoOptions = {}): internal.CustomerBillingProfile {
        const profile = internal.CustomerBillingProfile.create({
            id: this.profile_id,
            networkId: this.network_id,
            endDate: this.stop,
            startDate: this.start,
        })
        return profile
    }

}
