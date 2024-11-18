import {ApiProperty} from '@nestjs/swagger'
import {IsBoolean, IsInt, IsNumber, IsString} from 'class-validator'

import {RbacRole} from '~/config/constants.config'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'

export class NumberResponseDto implements ResponseDto {
    @IsInt()
    @ApiProperty()
        subscriber_id: number

    @IsInt()
    @ApiProperty()
        id: number

    @IsInt()
    @ApiProperty()
        customer_id: number

    @IsNumber()
    @ApiProperty()
        cc: number

    @IsString()
    @ApiProperty()
        ac: string

    @IsString()
    @ApiProperty()
        sn: string

    @IsBoolean()
    @ApiProperty()
        is_primary: boolean

    @IsBoolean()
    @ApiProperty()
        is_devid: boolean

    @IsInt()
    @ApiProperty()
        reseller_id: number

    constructor(data: internal.VoipNumber, role: RbacRole) {
        this.subscriber_id = data.subscriberID
        this.id = data.id
        this.customer_id = data.contractID
        this.cc = data.cc
        this.ac = data.ac
        this.sn = data.sn
        this.is_devid = data.isDevID
        this.is_primary = data.isPrimary
        if ([RbacRole.admin, RbacRole.system, RbacRole.ccareadmin].includes(role))
            this.reseller_id = data.resellerID
    }
}