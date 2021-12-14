import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsEmail, IsNotEmpty, IsOptional} from 'class-validator'

export class AdminCreateDto {
    @IsOptional()
    @IsEmail()
    @ApiPropertyOptional({description: 'Email address', example: 'admin@example.com'})
    email?: string

    @ApiPropertyOptional({example: 1, description: 'Unique identifier of a reseller', type: 'integer'})
    reseller_id?: number

    @IsNotEmpty()
    @ApiProperty({example: 'jsmith', description: 'Username used for authentication'})
    login: string

    @ApiPropertyOptional({
        description: 'Can manage other admin users within the same or level permission levels ' +
            '(only applies to "System", "Admin" and "Reseller") roles',
    })
    is_master?: boolean = false

    @ApiPropertyOptional({description: 'Can use the UI/API'})
    is_active?: boolean = true

    @ApiPropertyOptional({description: 'Set access to read-only, cannot change any data'})
    read_only?: boolean = false

    @ApiPropertyOptional({description: 'Can see passwords'})
    show_passwords?: boolean = true

    @ApiPropertyOptional({description: 'Call data'})
    call_data?: boolean = true

    @ApiPropertyOptional({description: 'Can manage "topup vouchers"'})
    billing_data?: boolean = true

    @ApiPropertyOptional({description: 'Can reset password'})
    can_reset_password?: boolean = true

    @IsNotEmpty()
    @ApiProperty({description: 'Password to be set for the user'})
    password: string

    @IsNotEmpty()
    @ApiProperty()
    role: string
}
