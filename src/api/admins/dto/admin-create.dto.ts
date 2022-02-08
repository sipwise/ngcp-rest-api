import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsEmail, IsNotEmpty, IsOptional} from 'class-validator'
import {internal} from '../../../entities'
import {RBAC_ROLES} from '../../../config/constants.config'

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

    async toDomain(): Promise<internal.Admin> {
        const admin = new internal.Admin()

        admin.billing_data = this.billing_data
        admin.call_data = this.call_data
        admin.can_reset_password = this.can_reset_password
        admin.email = this.email
        admin.is_active = this.is_active
        admin.is_master = this.is_master
        admin.login = this.login
        admin.read_only = this.read_only
        admin.reseller_id = this.reseller_id
        admin.role = this.role
        admin.show_passwords = this.show_passwords
        admin.password = this.password

        return admin
    }
}
