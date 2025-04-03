import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsBase32, IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength} from 'class-validator'
import {generate as passwordGenerator} from 'generate-password'

import {RbacRole} from '~/config/constants.config'
import {IsValidPassword} from '~/decorators/is-valid-password.decorator'
import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'

export class AdminRequestDto implements RequestDto {
    @IsOptional()
    @IsEmail()
    @MaxLength(255)
    @ApiPropertyOptional({description: 'Email address', example: 'admin@example.com'})
        email?: string

    @IsOptional()
    @IsNotEmpty()
    @ApiPropertyOptional({example: 1, description: 'Unique identifier of a reseller', type: 'integer'})
        reseller_id?: number

    @IsNotEmpty()
    @MinLength(5)
    @MaxLength(31)
    @ApiProperty({example: 'jsmith', description: 'Username used for authentication'})
        login: string

    @IsOptional()
    @ApiPropertyOptional({
        description: 'Can manage other admin users within the same or level permission levels ' +
            '(only applies to "System", "Admin" and "Reseller") roles',
        default: false,
    })
        is_master?: boolean = false

    @IsOptional()
    @ApiPropertyOptional({description: 'Can use the UI/API', default: true})
        is_active?: boolean

    @IsOptional()
    @ApiPropertyOptional({description: 'Set access to read-only, cannot change any data', default: false})
        read_only?: boolean

    @IsOptional()
    @ApiPropertyOptional({description: 'Can see passwords', default: true})
        show_passwords?: boolean

    @IsOptional()
    @ApiPropertyOptional({description: 'Call data', default: true})
        call_data?: boolean

    @IsOptional()
    @ApiPropertyOptional({description: 'Can manage "topup vouchers"', default: true})
        billing_data?: boolean

    @IsOptional()
    @ApiPropertyOptional({description: 'Can reset password', default: true})
        can_reset_password?: boolean

    @IsString()
    @IsNotEmpty()
    @IsValidPassword({username: 'login'})
    @ApiProperty({description: 'Password to be set for the user'})
        password: string

    @IsNotEmpty()
    @IsEnum(RbacRole)
    @ApiProperty({description: 'Access level of the user', enum: RbacRole})
        role: RbacRole

    @IsBoolean()
    @ApiProperty()
        enable_2fa: boolean

    @IsOptional()
    @IsBoolean()
    @ApiProperty()
        otp_init?: boolean

    @IsOptional()
    @IsBase32()
    @ApiPropertyOptional()
        otp_secret_key?: string

    constructor(entity?: internal.Admin) {
        if (!entity)
            return

        this.email = entity.email
        this.reseller_id = entity.reseller_id
        this.login = entity.login
        this.is_master = entity.is_master
        this.is_active = entity.is_active
        this.read_only = entity.read_only
        this.show_passwords = entity.show_passwords
        this.call_data = entity.call_data
        this.billing_data = entity.billing_data
        this.can_reset_password = entity.can_reset_password
        this.password = entity.password
        this.role = entity.role
        this.enable_2fa = entity.enable_2fa
        this.otp_init = entity.show_otp_registration_info
        this.otp_secret_key = entity.otp_secret
    }

    toInternal(options: RequestDtoOptions = {}): internal.Admin {
        if (options.setDefaults)
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
        admin.enable_2fa = this.enable_2fa
        admin.otp_secret = this.otp_secret_key
        admin.show_otp_registration_info = this.otp_init

        if (options.id)
            admin.id = options.id

        if (options.assignNulls) {
            Object.keys(admin).forEach(k => {
                if (admin[k] === undefined)
                    admin[k] = null
            })
        }
        return admin
    }

    private setDefaultsForUndefined(): void {
        this.is_master ??= false
        this.is_active ??= true
        this.read_only ??= false
        this.show_passwords ??= true
        this.call_data ??= true
        this.billing_data ??= true
        this.can_reset_password ??= true
        this.otp_secret_key ??= null
        this.password ??= passwordGenerator({
            length: 16,
            lowercase: true,
            uppercase: true,
            symbols: true,
            numbers: true,
        })
    }
}
