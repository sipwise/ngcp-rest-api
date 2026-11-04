import {ApiPropertyOptional} from '@nestjs/swagger'
import {IsOptional, IsString} from 'class-validator'

export class AuthCredentialsRequestDto {
    @IsOptional()
    @IsString()
    @ApiPropertyOptional({description: 'Login username, an alternative to HTTP Basic authentication'})
        username?: string

    @IsOptional()
    @IsString()
    @ApiPropertyOptional({description: 'Login password, an alternative to HTTP Basic authentication', format: 'password'})
        password?: string
}
