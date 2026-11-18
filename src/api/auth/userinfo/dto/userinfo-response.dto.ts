import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsBoolean, IsDate, IsInt, IsObject, IsOptional, IsString} from 'class-validator'

import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {DateTimeField} from '~/decorators/date-time-field.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'

export class UserinfoResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty({description: 'Id of the admin, or of the subscriber for subscriber roles'})
        id: number

    @IsString()
    @ApiProperty({description: 'Login of the admin, or web username of the subscriber'})
        username: string

    @IsString()
    @ApiProperty({description: 'Role of the user'})
        role: string

    @IsOptional()
    @IsObject()
    @ApiPropertyOptional({description: 'ACL role of the admin with its permissions; admin roles only'})
        role_data?: internal.AclRole

    @IsBoolean()
    @ApiProperty({description: 'User is active; always `true` for subscribers'})
        active: boolean

    @IsBoolean()
    @ApiProperty({description: 'User can not make changes; always `false` for subscribers'})
        readOnly: boolean

    @IsBoolean()
    @ApiProperty({description: 'User can see passwords; always `false` for subscribers'})
        showPasswords: boolean

    @IsBoolean()
    @ApiProperty({description: 'Master admin of its reseller; always `false` for subscribers'})
        is_master: boolean

    @IsOptional()
    @IsInt()
    @ApiProperty({description: 'Reseller of the user'})
        reseller_id: number

    @IsBoolean()
    @ApiProperty({description: 'User is limited to its reseller: reseller, ccare and subscriber roles'})
        reseller_id_required: boolean

    @IsOptional()
    @IsInt()
    @ApiPropertyOptional({description: 'Customer of the subscriber; subscriber roles only'})
        customer_id?: number

    @IsOptional()
    @IsString()
    @ApiPropertyOptional({description: 'UUID of the subscriber; subscriber roles only'})
        uuid?: string

    @DateTimeField()
    @IsOptional()
    @IsDate()
    @ApiPropertyOptional({description: 'Last password change'})
        password_modified_timestamp?: Date

    @IsOptional()
    @IsBoolean()
    @ApiPropertyOptional({description: 'Two-factor authentication is enabled; admin roles only'})
        enable_2fa?: boolean

    @IsOptional()
    @IsBoolean()
    @ApiPropertyOptional({description: 'OTP registration info (QR code) is still to be shown; admin roles only'})
        otp_init?: boolean

    constructor(user: AuthResponseDto) {
        super()
        this.id = user.id
        this.username = user.username
        this.role = user.role
        this.role_data = user.role_data
        this.active = user.active
        this.readOnly = user.readOnly
        this.showPasswords = user.showPasswords
        this.is_master = user.is_master
        this.reseller_id = user.reseller_id
        this.reseller_id_required = user.reseller_id_required
        this.customer_id = user.customer_id
        this.uuid = user.uuid
        this.password_modified_timestamp = user.password_modified_timestamp
        this.enable_2fa = user.enable_2fa
        this.otp_init = user.otp_init
    }
}
