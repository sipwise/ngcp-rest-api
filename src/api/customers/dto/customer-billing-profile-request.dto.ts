import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {IsDate, IsNumber, IsOptional} from 'class-validator'

import {RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class CustomerBillingProfileRequestDto {
    @ApiProperty()
    @IsNumber()
        profile_id: number

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
        network_id?: number

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Date)
    @IsDate()
        start?: Date

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Date)
    @IsDate()
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
