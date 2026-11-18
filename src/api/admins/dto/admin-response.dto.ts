import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsBoolean, IsDate, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString} from 'class-validator'

import {RbacRole, adminRoles} from '~/config/constants.config'
import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {DateTimeField} from '~/decorators/date-time-field.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class AdminResponseDto extends ResponseDto {
    @IsBoolean()
    @ApiProperty({description: 'User can see billing data such as top-up voucher codes'})
        billing_data!: boolean

    @IsBoolean()
    @ApiProperty({description: 'User can see call data (CDRs, call flows)'})
        call_data!: boolean

    @IsBoolean()
    @ApiProperty({description: 'User can reset its password'})
        can_reset_password!: boolean

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'Email address'})
        email!: string

    @IsInt()
    @ApiProperty({description: 'Id of the admin'})
        id!: number

    @IsBoolean()
    @ApiProperty({description: 'User is active'})
        is_active!: boolean

    @IsBoolean()
    @ApiProperty({description: 'Master admin of its reseller'})
        is_master!: boolean

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Username used for authentication'})
        login!: string

    @IsBoolean()
    @ApiProperty({description: 'User can not make changes'})
        read_only!: boolean

    @IsOptional()
    @IsInt()
    @ApiProperty({description: 'Reseller of the admin'})
        reseller_id?: number

    @IsEnum(RbacRole)
    @ApiProperty({description: 'Access level of the user', enum: adminRoles})
        role!: RbacRole

    @IsBoolean()
    @ApiProperty({description: 'User can see passwords'})
        show_passwords!: boolean

    @DateTimeField()
    @IsDate()
    @ApiProperty({description: 'Time of the last password change'})
        password_last_modify_time: Date

    @IsBoolean()
    @ApiProperty({description: 'Two-factor authentication is enabled'})
        enable_2fa: boolean

    @IsBoolean()
    @ApiProperty({description: 'OTP registration info (QR code) is still to be shown'})
        otp_init: boolean

    @CanBeNull()
    @ApiPropertyOptional({description: 'OTP secret key, Base32; only shown to the admin itself'})
        otp_secret_key?: string

    constructor(admin: internal.Admin, role: RbacRole, options?: ResponseDtoOptions) {
        super(options)
        this.billing_data = admin.billingData
        this.call_data = admin.callData
        this.can_reset_password = admin.canResetPassword
        this.email = admin.email
        this.id = admin.id
        this.is_active = admin.isActive
        this.is_master = admin.isMaster
        this.login = admin.login
        this.read_only = admin.readOnly
        this.role = admin.role
        this.show_passwords = admin.showPasswords
        this.password_last_modify_time = admin.saltedpassModifyTimestamp
        this.enable_2fa = admin.enable2fa
        this.otp_init = admin.otpInit
        this.otp_secret_key = admin.otpSecret

        if ([RbacRole.admin, RbacRole.system, RbacRole.ccareadmin].includes(role)) {
            this.reseller_id = admin.resellerId
        }
    }
}
