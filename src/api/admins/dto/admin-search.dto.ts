import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {AdminResponseDto} from './admin-response.dto'

import {RbacRole, adminRoles} from '~/config/constants.config'
import {DateTimeField, DateTimeKind} from '~/decorators/date-time-field.decorator'
import {dateTimeFilter} from '~/helpers/query-builder.helper'

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
        is_master: boolean
    @ApiPropertyOptional()
        login: string
    @ApiPropertyOptional()
        read_only: boolean
    @ApiPropertyOptional()
        reseller_id?: number
    @ApiPropertyOptional({enum: adminRoles})
        role: RbacRole
    @ApiPropertyOptional()
        show_passwords: boolean
    @DateTimeField()
    @ApiPropertyOptional()
        password_last_modify_time: Date
    @ApiPropertyOptional()
        enable_2fa: boolean
    @ApiPropertyOptional()
        otp_init: boolean
    @ApiPropertyOptional()
        otp_secret?: string
    @ApiHideProperty()
        _alias = {
            id: 'admin.id',
            password_last_modify_time: dateTimeFilter(DateTimeKind.DateTime, 'admin.saltedpass_modify_timestamp'),
        }
}
