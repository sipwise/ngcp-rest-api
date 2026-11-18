import {ApiProperty} from '@nestjs/swagger'
import {IsDate, IsInt, IsNotEmpty, IsString} from 'class-validator'

import {DateTimeField} from '~/decorators/date-time-field.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class BanSubscriberResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty({description: 'Id of the banned subscriber'})
        id: number

    @IsInt()
    @ApiProperty({description: 'Reseller of the subscriber'})
        reseller_id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Web login of the subscriber'})
        username: string

    @IsInt()
    @ApiProperty({description: 'Ban stage, auto incremented by each subsequent ban, with growing ban time based on the value'})
        ban_increment_stage: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'IP address of the last banned login attempt'})
        last_banned_ip: string

    @DateTimeField()
    @IsDate()
    @IsNotEmpty()
    @ApiProperty({description: 'Time of the last ban'})
        last_banned_at: Date

    constructor(entity: internal.BanSubscriber, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id
        this.reseller_id = entity.resellerId
        this.username = entity.username
        this.ban_increment_stage = entity.banIncrementStage
        this.last_banned_ip = entity.lastBannedIp
        this.last_banned_at = entity.lastBannedAt
    }
}