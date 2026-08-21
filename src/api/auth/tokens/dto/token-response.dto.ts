import {ApiProperty} from '@nestjs/swagger'
import {IsString} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class AuthTokenResponseDto extends ResponseDto {
    @IsString()
    @ApiProperty()
        id: string

    @IsString()
    @ApiProperty({description: 'Free-form identifier for the client or device requesting the token'})
        identifier: string

    @IsString()
    @ApiProperty({description: 'ISO 8601 timestamp when the token was created'})
        created_at: string

    @IsString()
    @ApiProperty({description: 'ISO 8601 timestamp when the token expires'})
        expires_at: string


    constructor(token: internal.AuthToken, options?: ResponseDtoOptions) {
        super(options)
        this.id = token.id
        this.identifier = token.identifier
        this.created_at = token.createdAt
        this.expires_at = token.expiresAt
    }
}
