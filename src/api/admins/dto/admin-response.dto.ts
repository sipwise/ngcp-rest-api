import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {Expose} from 'class-transformer'
import {IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString} from 'class-validator'

import {RbacRole} from '~/config/constants.config'
import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {Expandable} from '~/decorators/expandable.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class AdminResponseDto extends ResponseDto {
    @IsBoolean()
    @ApiProperty()
        billing_data!: boolean

    @IsBoolean()
    @ApiProperty()
        call_data!: boolean

    @IsBoolean()
    @ApiProperty()
        can_reset_password!: boolean

    @CanBeNull()
    @IsString()
    @ApiProperty()
        email!: string

    @IsInt()
    @ApiProperty()
        id!: number

    @IsBoolean()
    @ApiProperty()
        is_active!: boolean

    @IsBoolean()
    @ApiProperty()
        is_ccare!: boolean

    @IsBoolean()
    @ApiProperty()
        is_master!: boolean

    @IsBoolean()
    @ApiProperty()
        is_superuser!: boolean

    @IsBoolean()
    @ApiProperty()
        is_system!: boolean

    @IsBoolean()
    @ApiProperty()
        lawful_intercept!: boolean

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        login!: string

    @IsBoolean()
    @ApiProperty()
        read_only!: boolean

    @IsOptional()
    @IsInt()
    @ApiProperty()
    @Expandable({name: 'reseller_id', controller: 'resellerController'})
        reseller_id?: number

    @IsEnum(RbacRole)
    @ApiProperty()
        role!: RbacRole

    @IsBoolean()
    @ApiProperty()
        show_passwords!: boolean

    @IsString()
    @ApiProperty()
        password_last_modify_time: string

    @IsBoolean()
    @ApiProperty()
    @Expose({name: '2fa'})
        enable_2fa: boolean

    @IsBoolean()
    @ApiProperty()
        otp_init: boolean

    @CanBeNull()
    @ApiPropertyOptional()
        otp_secret_key?: string

    constructor(admin: internal.Admin, role: RbacRole, options?: ResponseDtoOptions) {
        super(options)
        this.billing_data = admin.billingData
        this.call_data = admin.callData
        this.can_reset_password = admin.canResetPassword
        this.email = admin.email
        this.id = admin.id
        this.is_active = admin.isActive
        this.is_ccare = admin.isCcare
        this.is_master = admin.isMaster
        this.is_superuser = admin.isSuperuser
        this.is_system = admin.isSystem
        this.lawful_intercept = admin.lawfulIntercept
        this.login = admin.login
        this.read_only = admin.readOnly
        this.role = admin.role
        this.show_passwords = admin.showPasswords
        this.password_last_modify_time = admin.saltedpassModifyTimestamp.toISOString()
        this.enable_2fa = admin.enable2fa
        this.otp_init = admin.otpInit
        this.otp_secret_key = admin.otpSecret

        if ([RbacRole.admin, RbacRole.system, RbacRole.ccareadmin].includes(role)) {
            this.reseller_id = admin.resellerId
        }
    }
}
