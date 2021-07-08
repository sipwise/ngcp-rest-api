import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsEmail, IsNotEmpty} from 'class-validator'

export class AdminCreateDto {
    @ApiPropertyOptional({example: 1, description: 'Unique identifier of a reseller', type: 'integer'})
    readonly reseller_id?: number

    @IsNotEmpty()
    @ApiProperty({example: 'jsmith', description: 'Username used for authentication'})
    readonly login: string

    @IsNotEmpty()
    @ApiProperty({description: 'Is master'})
    readonly is_master: boolean

    @IsNotEmpty()
    @ApiProperty({description: 'Is superuser'})
    readonly is_superuser: boolean

    @IsNotEmpty()
    @ApiProperty({description: 'Is ccare'})
    readonly is_ccare: boolean

    @IsNotEmpty()
    @ApiProperty({description: 'Is active'})
    readonly is_active: boolean

    @IsNotEmpty()
    @ApiProperty({description: 'Is read-only'})
    readonly read_only: boolean

    @IsNotEmpty()
    @ApiProperty({description: 'Show passwords'})
    readonly show_passwords: boolean

    @IsNotEmpty()
    @ApiProperty({description: 'Call data'})
    readonly call_data: boolean

    @IsNotEmpty()
    @ApiProperty({description: 'Billing data'})
    readonly billing_data: boolean

    @IsNotEmpty()
    @ApiProperty({description: 'Lawful intercept'})
    readonly lawful_intercept: boolean

    @IsNotEmpty()
    @IsEmail()
    @ApiProperty({description: 'Email address', example: 'admin@example.com'})
    readonly email: string

    @IsNotEmpty()
    @ApiProperty({description: 'Can reset password'})
    readonly can_reset_password: boolean

    @IsNotEmpty()
    @ApiProperty({description: 'Is system user'})
    readonly is_system: boolean

    @IsNotEmpty()
    @ApiProperty({description: 'Password to be set for user'})
    readonly password: string
}
