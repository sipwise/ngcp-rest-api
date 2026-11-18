import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {AdminResponseDto} from './admin-response.dto'

import {RbacRole, adminRoles} from '~/config/constants.config'
import {DateTimeField, DateTimeKind} from '~/decorators/date-time-field.decorator'
import {dateTimeFilter} from '~/helpers/query-builder.helper'

export class AdminSearchDto implements AdminResponseDto {
    @ApiPropertyOptional({description: 'User can see billing data such as top-up voucher codes'})
        billing_data: boolean
    @ApiPropertyOptional({description: 'User can see call data (CDRs, call flows)'})
        call_data: boolean
    @ApiPropertyOptional({description: 'User can reset its password'})
        can_reset_password: boolean
    @ApiPropertyOptional({description: 'Email address'})
        email: string
    @ApiPropertyOptional({description: 'Id of the admin'})
        id: number
    @ApiPropertyOptional({description: 'User is active'})
        is_active: boolean
    @ApiPropertyOptional({description: 'Master admin of its reseller'})
        is_master: boolean
    @ApiPropertyOptional({description: 'Username used for authentication'})
        login: string
    @ApiPropertyOptional({description: 'User can not make changes'})
        read_only: boolean
    @ApiPropertyOptional({description: 'Reseller of the admin'})
        reseller_id?: number
    @ApiPropertyOptional({description: 'Access level of the user', enum: adminRoles})
        role: RbacRole
    @ApiPropertyOptional({description: 'User can see passwords'})
        show_passwords: boolean
    @DateTimeField()
    @ApiPropertyOptional({description: 'Time of the last password change'})
        password_last_modify_time: Date
    @ApiPropertyOptional({description: 'Two-factor authentication is enabled'})
        enable_2fa: boolean
    @ApiPropertyOptional({description: 'OTP registration info (QR code) is still to be shown'})
        otp_init: boolean
    @ApiPropertyOptional({description: 'OTP secret key, Base32'})
        otp_secret?: string
    @ApiHideProperty()
        _alias = {
            id: 'admin.id',
            password_last_modify_time: dateTimeFilter(DateTimeKind.DateTime, 'admin.saltedpass_modify_timestamp'),
        }
}
