import {ApiPropertyOptional} from '@nestjs/swagger'
import {RequestDto} from '../../../../../dto/request.dto'
import {IsValidPassword} from '../../../../../decorators/is-valid-password.decorator'

export class PasswordChangeRequestDto implements RequestDto {

    @IsValidPassword({})
    @ApiPropertyOptional({description: 'New Password', example: 'FooBarBaz123!!!'})
        new_password!: string

    toInternal() {}
}
