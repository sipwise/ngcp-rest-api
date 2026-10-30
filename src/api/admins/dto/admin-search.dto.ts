import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {AdminResponseDto} from './admin-response.dto'

import {RbacRole} from '~/config/constants.config'

export class AdminSearchDto implements AdminResponseDto {
    @ApiPropertyOptional()
        billing_data: boolean
    @ApiPropertyOptional()
        call_data: boolean
    @ApiPropertyOptional()
        can_reset_password: boolean
    @ApiPropertyOptional()
        email: string
    @ApiPropertyOptional()
        id: number
    @ApiPropertyOptional()
        is_active: boolean
    @ApiPropertyOptional()
        is_ccare: boolean
    @ApiPropertyOptional()
        is_master: boolean
    @ApiPropertyOptional()
        is_superuser: boolean
    @ApiPropertyOptional()
        is_system: boolean
    @ApiPropertyOptional()
        lawful_intercept: boolean
    @ApiPropertyOptional()
        login: string
    @ApiPropertyOptional()
        read_only: boolean
    @ApiPropertyOptional()
        reseller_id?: number
    @ApiPropertyOptional()
        role: RbacRole
    @ApiPropertyOptional()
        show_passwords: boolean
    @ApiPropertyOptional()
        password_last_modify_time: string
    @ApiPropertyOptional()
        enable_2fa: boolean
    @ApiPropertyOptional()
        otp_init: boolean
    @ApiPropertyOptional()
        otp_secret?: string
    @ApiHideProperty()
        _alias = {
            id: 'admin.id',
            password_last_modify_time: 'saltedpass_modify_timestamp',
        }
}
