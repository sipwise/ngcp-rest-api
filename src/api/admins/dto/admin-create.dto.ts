import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsEmail, IsNotEmpty, IsOptional} from 'class-validator'

export class AdminCreateDto {
    @IsOptional()
    @IsEmail()
    @ApiProperty({description: 'Email address', example: 'admin@example.com'})
    readonly email?: string

    @ApiPropertyOptional({example: 1, description: 'Unique identifier of a reseller', type: 'integer'})
    readonly reseller_id?: number

    @IsNotEmpty()
    @ApiProperty({example: 'jsmith', description: 'Username used for authentication'})
    readonly login: string

    @IsNotEmpty()
    @ApiProperty({
        description: 'Can manage other admin users within the same or level permission levels ' +
            '(only applies to "System", "Admin" and "Reseller") roles',
    })
    readonly is_master: boolean

    @IsNotEmpty()
    @ApiProperty({description: 'Can use the UI/API'})
    readonly is_active: boolean

    @IsNotEmpty()
    @ApiProperty({description: 'Set access to read-only, cannot change any data'})
    readonly read_only: boolean

    @IsNotEmpty()
    @ApiProperty({description: 'Can see passwords'})
    readonly show_passwords: boolean

    @IsNotEmpty()
    @ApiProperty({description: 'Call data'})
    readonly call_data: boolean

    @IsNotEmpty()
    @ApiProperty({description: 'Can manage "topup vouchers"'})
    readonly billing_data: boolean

    @IsNotEmpty()
    @ApiProperty({description: 'Can reset password'})
    readonly can_reset_password: boolean

    @ApiProperty({description: 'Password to be set for user'})
    password: string

    @IsNotEmpty()
    @ApiProperty()
    readonly role: string
}
