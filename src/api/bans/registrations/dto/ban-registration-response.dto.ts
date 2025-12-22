import {ApiProperty} from '@nestjs/swagger'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class BanRegistrationResponseDto extends ResponseDto {
    @ApiProperty()
        id!: number

    @ApiProperty()
        username!: string

    @ApiProperty()
        domain!: string

    @ApiProperty()
        auth_count!: number

    @ApiProperty()
        last_auth!: Date

    constructor(entity: internal.BanRegistration, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id
        this.username = entity.username
        this.domain = entity.domain
        this.auth_count = entity.authCount
        this.last_auth = entity.lastAuth
    }
}
