import {ApiProperty} from '@nestjs/swagger'
import {IsEmail, IsNotEmpty} from 'class-validator'
import {AdminBaseDto} from './admin-base.dto'

export class AdminCreateDto extends AdminBaseDto {
    @IsNotEmpty()
    @IsEmail()
    @ApiProperty({description: 'Email address', example: 'admin@example.com'})
    readonly email?: string

}
