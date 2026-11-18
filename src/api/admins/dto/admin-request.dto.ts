import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsBase32, IsBoolean, IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength, MinLength} from 'class-validator'
import {generate as passwordGenerator} from 'generate-password'

import {RbacRole, adminRoles} from '~/config/constants.config'
import {IsValidPassword} from '~/decorators/is-valid-password.decorator'
import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'

export class AdminRequestDto implements RequestDto {
    @IsOptional()
    @IsEmail()
    @MaxLength(255)
    @ApiPropertyOptional({description: 'Email address', example: 'admin@example.com'})
        email?: string

    @ApiPropertyOptional({
        example: 1,
        description: 'Reseller of the admin; required for admin roles, the own reseller for reseller roles',
        type: 'integer',
    })
    @IsOptional()
    @IsPositive()
    @IsInt()
        reseller_id?: number

    @IsNotEmpty()
    @MinLength(5)
    @MaxLength(31)
    @ApiProperty({example: 'jsmith', description: 'Username used for authentication'})
        login: string

    @IsOptional()
    @ApiPropertyOptional({
        description: 'Master admin of its reseller',
        default: false,
    })
        is_master?: boolean = false

    @IsOptional()
    @ApiPropertyOptional({description: 'User is active', default: true})
        is_active?: boolean

    @IsOptional()
    @ApiPropertyOptional({description: 'User can not make changes', default: false})
        read_only?: boolean

    @IsOptional()
    @ApiPropertyOptional({description: 'User can see passwords', default: true})
        show_passwords?: boolean

    @IsOptional()
    @ApiPropertyOptional({description: 'User can see call data (CDRs, call flows)', default: true})
        call_data?: boolean

    @IsOptional()
    @ApiPropertyOptional({description: 'User can see billing data such as top-up voucher codes', default: true})
        billing_data?: boolean

    @IsOptional()
    @ApiPropertyOptional({description: 'User can reset its password', default: true})
        can_reset_password?: boolean

    @IsString()
    @IsNotEmpty()
    @IsValidPassword({username: 'login'})
    @ApiProperty({description: 'Password to be set for the user'})
        password: string

    @IsNotEmpty()
    @IsIn(adminRoles)
    @ApiProperty({description: 'Access level of the user', enum: adminRoles})
        role: RbacRole

    @IsBoolean()
    @ApiProperty({description: 'Two-factor authentication is enabled; enabling it generates an OTP secret key'})
        enable_2fa: boolean

    @IsOptional()
    @IsBoolean()
    @ApiProperty({description: 'OTP registration info (QR code) is still to be shown'})
        otp_init?: boolean

    @IsOptional()
    @IsBase32()
    @ApiPropertyOptional({description: 'OTP secret key, Base32; generated when 2FA is enabled without one'})
        otp_secret_key?: string

    constructor(entity?: internal.Admin) {
        if (!entity)
            return

        this.email = entity.email
        this.reseller_id = entity.resellerId
        this.login = entity.login
        this.is_master = entity.isMaster
        this.is_active = entity.isActive
        this.read_only = entity.readOnly
        this.show_passwords = entity.showPasswords
        this.call_data = entity.callData
        this.billing_data = entity.billingData
        this.can_reset_password = entity.canResetPassword
        this.password = entity.password
        this.role = entity.role
        this.enable_2fa = entity.enable2fa
        this.otp_init = entity.otpInit
        this.otp_secret_key = entity.otpSecret
    }

    toInternal(options: RequestDtoOptions = {}): internal.Admin {
        if (options.setDefaults)
            this.setDefaultsForUndefined()

        const admin = new internal.Admin()

        admin.billingData = this.billing_data
        admin.callData = this.call_data
        admin.canResetPassword = this.can_reset_password
        admin.email = this.email
        admin.isActive = this.is_active
        admin.isMaster = this.is_master
        admin.login = this.login
        admin.readOnly = this.read_only
        admin.resellerId = this.reseller_id
        admin.role = this.role
        admin.showPasswords = this.show_passwords
        admin.password = this.password
        admin.enable2fa = this.enable_2fa
        admin.otpSecret = this.otp_secret_key
        admin.otpInit = this.otp_init

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
