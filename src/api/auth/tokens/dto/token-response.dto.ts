import {ApiProperty} from '@nestjs/swagger'
import {IsString} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class AuthTokenResponseDto extends ResponseDto {
    @IsString()
    @ApiProperty({description: 'Id of the auth token'})
        id: string

    @IsString()
    @ApiProperty({description: 'Free-form identifier for the client or device requesting the token'})
        identifier: string

    @IsString()
    @ApiProperty({description: 'Creation time, ISO 8601'})
        created_at: string

    @IsString()
    @ApiProperty({description: 'Expiry time, ISO 8601'})
        expires_at: string


    constructor(token: internal.AuthToken, options?: ResponseDtoOptions) {
        super(options)
        this.id = token.id
        this.identifier = token.identifier
        this.created_at = token.createdAt
        this.expires_at = token.expiresAt
    }
}
