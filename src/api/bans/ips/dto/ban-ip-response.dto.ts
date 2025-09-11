import {ApiProperty} from '@nestjs/swagger'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class BanIpResponseDto extends ResponseDto {
    @ApiProperty()
        id!: number

    @ApiProperty()
        ip!: string

    constructor(entity: internal.BanIp, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id
        this.ip = entity.ip
    }
}
