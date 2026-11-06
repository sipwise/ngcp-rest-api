import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsBoolean, IsDate, IsInt, IsObject, IsOptional, IsString} from 'class-validator'

import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'

export class UserinfoResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty()
        id: number

    @IsString()
    @ApiProperty()
        username: string

    @IsString()
    @ApiProperty()
        role: string

    @IsOptional()
    @IsObject()
    @ApiPropertyOptional()
        role_data?: internal.AclRole

    @IsBoolean()
    @ApiProperty()
        active: boolean

    @IsBoolean()
    @ApiProperty()
        readOnly: boolean

    @IsBoolean()
    @ApiProperty()
        showPasswords: boolean

    @IsBoolean()
    @ApiProperty()
        is_master: boolean

    @IsOptional()
    @IsInt()
    @ApiProperty()
        reseller_id: number

    @IsBoolean()
    @ApiProperty()
        reseller_id_required: boolean

    @IsOptional()
    @IsInt()
    @ApiPropertyOptional()
        customer_id?: number

    @IsOptional()
    @IsString()
    @ApiPropertyOptional()
        uuid?: string

    @IsOptional()
    @IsDate()
    @ApiPropertyOptional()
        password_modified_timestamp?: Date

    @IsOptional()
    @IsBoolean()
    @ApiPropertyOptional()
        enable_2fa?: boolean

    @IsOptional()
    @IsBoolean()
    @ApiPropertyOptional()
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
