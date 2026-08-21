import {ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty, IsNumber, IsString, Max, Min} from 'class-validator'
import {v4 as uuidv4} from 'uuid'

import {AppService} from '~/app.service'
import {RequestDto} from '~/dto/request.dto'
import {internal} from '~/entities'

const {auth_token_min_ttl: minTtl, auth_token_max_ttl: maxTtl} = AppService.config.common

export class AuthTokenRequestDto implements RequestDto {
    @IsNotEmpty()
    @IsString()
    @ApiProperty({description: 'Free-form identifier for the client or device requesting the token'})
        identifier: string

    @IsNotEmpty()
    @IsNumber()
    @Min(minTtl)
    @Max(maxTtl)
    @ApiProperty({description: `Token lifetime in seconds, between ${minTtl} and ${maxTtl}`, type: 'integer'})
        expires_in: number

    toInternal(): internal.AuthToken {
        const token = new internal.AuthToken()
        token.id = uuidv4()
        token.identifier = this.identifier
        token.ttl = this.expires_in
        return token
    }
}
