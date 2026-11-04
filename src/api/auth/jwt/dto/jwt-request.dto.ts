import {ApiPropertyOptional} from '@nestjs/swagger'
import {IsInt, IsOptional, Max, Min} from 'class-validator'

import {AppService} from '~/app.service'
import {AuthCredentialsRequestDto} from '~/auth/dto/auth-credentials-request.dto'

const {jwt_default_ttl: defTtl, jwt_min_ttl: minTtl, jwt_max_ttl: maxTtl} = AppService.config.common

export class AuthJwtRequestDto extends AuthCredentialsRequestDto {
    @IsOptional()
    @IsInt()
    @Min(minTtl)
    @Max(maxTtl)
    @ApiPropertyOptional({description: `Custom JWT lifetime in seconds, between ${minTtl} and ${maxTtl}. Defaults to ${defTtl} if omitted`, minimum: minTtl, maximum: maxTtl})
        expires_in?: number
}
