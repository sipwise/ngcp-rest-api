import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {AdminResponseDto} from './admin-response.dto'

import {RbacRole} from '~/config/constants.config'

export class AdminSearchDto implements AdminResponseDto {
    @ApiPropertyOptional()
        billing_data: boolean = undefined
    @ApiPropertyOptional()
        call_data: boolean = undefined
    @ApiPropertyOptional()
        can_reset_password: boolean = undefined
    @ApiPropertyOptional()
        email: string = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiPropertyOptional()
        is_active: boolean = undefined
    @ApiPropertyOptional()
        is_ccare: boolean = undefined
    @ApiPropertyOptional()
        is_master: boolean = undefined
    @ApiPropertyOptional()
        is_superuser: boolean = undefined
    @ApiPropertyOptional()
        is_system: boolean = undefined
    @ApiPropertyOptional()
        lawful_intercept: boolean = undefined
    @ApiPropertyOptional()
        login: string = undefined
    @ApiPropertyOptional()
        read_only: boolean = undefined
    @ApiPropertyOptional()
        reseller_id?: number = undefined
    @ApiPropertyOptional()
        role: RbacRole = undefined
    @ApiPropertyOptional()
        show_passwords: boolean = undefined
    @ApiPropertyOptional()
        password_last_modify_time: string = undefined
    @ApiPropertyOptional()
        enable_2fa: boolean = undefined
    @ApiPropertyOptional()
        otp_init: boolean = undefined
    @ApiPropertyOptional()
        otp_secret?: string
    @ApiHideProperty()
    _alias = {
        id: 'admin.id',
        password_last_modify_time: 'saltedpass_modify_timestamp',
    }
}
