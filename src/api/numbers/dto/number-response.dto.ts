import {ApiProperty} from '@nestjs/swagger'
import {IsBoolean, IsInt, IsNumber, IsString} from 'class-validator'

import {RbacRole} from '~/config/constants.config'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class NumberResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty({description: 'Subscriber the number is assigned to'})
        subscriber_id: number

    @IsInt()
    @ApiProperty({description: 'Id of the number'})
        id: number

    @IsInt()
    @ApiProperty({description: 'Customer of the subscriber'})
        customer_id: number

    @IsNumber()
    @ApiProperty({description: 'Country code'})
        cc: number

    @IsString()
    @ApiProperty({description: 'Area code, may be empty'})
        ac: string

    @IsString()
    @ApiProperty({description: 'Subscriber number'})
        sn: string

    @IsBoolean()
    @ApiProperty({description: 'Primary number of its subscriber'})
        is_primary: boolean

    @IsBoolean()
    @ApiProperty({description: 'Device id alias: the subscriber can register with it and receives only calls to it'})
        is_devid: boolean

    @IsInt()
    @ApiProperty({description: 'Reseller owning the number'})
        reseller_id: number

    constructor(data: internal.VoipNumber, role: RbacRole, options?: ResponseDtoOptions) {
        super(options)
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