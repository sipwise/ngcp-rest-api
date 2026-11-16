import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsNumber, IsOptional} from 'class-validator'

import {LocalDateTimeField} from '~/decorators/date-time-field.decorator'
import {RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'
import {DtoFields, withDtoFields} from '~/helpers/dto-fields.helper'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class CustomerBillingProfileRequestDto {
    static readonly dtoFields: DtoFields<internal.CustomerBillingProfile, CustomerBillingProfileRequestDto> = {id: 'profile_id', startDate: 'start', endDate: 'stop'}

    @ApiProperty()
    @IsNumber()
        profile_id: number

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
        network_id?: number

    @LocalDateTimeField()
    @ApiPropertyOptional()
    @IsOptional()
        start?: Date

    @LocalDateTimeField()
    @ApiPropertyOptional()
    @IsOptional()
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
        return withDtoFields(profile, CustomerBillingProfileRequestDto.dtoFields)
    }

}
