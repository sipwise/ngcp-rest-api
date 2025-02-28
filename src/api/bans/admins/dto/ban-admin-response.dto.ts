import {ApiProperty} from '@nestjs/swagger'
import {IsDate, IsInt, IsNotEmpty, IsString} from 'class-validator'

import {Expandable} from '~/decorators/expandable.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class BanAdminResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty()
        id: number

    @IsInt()
    @ApiProperty()
    @Expandable({name: 'reseller_id', controller: 'resellerController'})
        reseller_id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        username: string

    @IsInt()
    @ApiProperty()
        ban_increment_stage: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        last_banned_ip: string

    @IsDate()
    @IsNotEmpty()
    @ApiProperty()
        last_banned_at: Date

    constructor(entity: internal.BanAdmin, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id
        this.reseller_id = entity.resellerId
        this.username = entity.username
        this.ban_increment_stage = entity.banIncrementStage
        this.last_banned_ip = entity.lastBannedIp
        this.last_banned_at = entity.lastBannedAt
    }
}