import {ApiProperty} from '@nestjs/swagger'

import {DateTimeField} from '~/decorators/date-time-field.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class BanRegistrationResponseDto extends ResponseDto {
    @ApiProperty({description: 'Id of the registration ban'})
        id!: string

    @ApiProperty({description: 'SIP username of the banned registrations'})
        username!: string

    @ApiProperty({description: 'SIP domain of the banned registrations'})
        domain!: string

    @ApiProperty({description: 'Number of failed authentication attempts'})
        auth_count!: number

    @DateTimeField()
    @ApiProperty({description: 'Time of the last failed authentication attempt'})
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
