import {ApiPropertyOptional} from '@nestjs/swagger'

import {IsValidPassword} from '~/decorators/is-valid-password.decorator'
import {RequestDto} from '~/dto/request.dto'

export class PasswordChangeRequestDto implements RequestDto {

    @IsValidPassword({})
    @ApiPropertyOptional({description: 'New Password', example: 'FooBarBaz123!!!'})
        new_password!: string

    toInternal(): void {/*TODO: empty?*/}
}
