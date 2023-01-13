import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsEmail, IsEnum, IsNotEmpty, IsOptional, MaxLength, MinLength} from 'class-validator'
import {internal} from '../../../entities'
import {RbacRole} from '../../../config/constants.config'
import {IsValidPassword} from '../../../decorators/is-valid-password.decorator'
import {generate as passwordGenerator} from 'generate-password'
import {AdminInterface} from '../../../entities/internal/admin.internal.entity'

export class AdminCreateDto {
    @IsEmail()
    @MaxLength(255)
    @ApiPropertyOptional({description: 'Email address', example: 'admin@example.com'})
        email?: string

    @IsNotEmpty()
    @ApiPropertyOptional({example: 1, description: 'Unique identifier of a reseller', type: 'integer'})
        reseller_id: number

    @IsNotEmpty()
    @MinLength(5)
    @MaxLength(31)
    @ApiProperty({example: 'jsmith', description: 'Username used for authentication'})
        login: string

    @ApiPropertyOptional({
        description: 'Can manage other admin users within the same or level permission levels ' +
            '(only applies to "System", "Admin" and "Reseller") roles',
        default: false,
    })
        is_master?: boolean

    @ApiPropertyOptional({description: 'Can use the UI/API', default: true})
        is_active?: boolean

    @ApiPropertyOptional({description: 'Set access to read-only, cannot change any data', default: false})
        read_only?: boolean

    @ApiPropertyOptional({description: 'Can see passwords', default: true})
        show_passwords?: boolean

    @ApiPropertyOptional({description: 'Call data', default: true})
        call_data?: boolean

    @ApiPropertyOptional({description: 'Can manage "topup vouchers"', default: true})
        billing_data?: boolean

    @ApiPropertyOptional({description: 'Can reset password', default: true})
        can_reset_password?: boolean

    @IsOptional()
    @IsValidPassword()
    @ApiProperty({description: 'Password to be set for the user'})
        password?: string

    @IsNotEmpty()
    @IsEnum(RbacRole)
    @ApiProperty({description: 'Access level of the user', enum: RbacRole})
        role: RbacRole

    static create(data: AdminInterface): AdminCreateDto {
        const admin = new AdminCreateDto()

        Object.keys(data).map(key => {
            if(data[key] != undefined) {
                admin[key] = data[key]
            } else {
                delete(admin[key])
            }
        })
        return admin
    }

    toInternal(setDefaults = true): internal.Admin {
        if (setDefaults)
            this.setDefaultsForUndefined()

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

    private setDefaultsForUndefined() {
        this.is_master ??= false
        this.is_active ??= true
        this.read_only ??= false
        this.show_passwords ??= true
        this.call_data ??= true
        this.billing_data ??= true
        this.can_reset_password ??= true
        this.password ??= passwordGenerator({
            length: 16,
            lowercase: true,
            uppercase: true,
            symbols: true,
            numbers: true,
        })
    }
}
