import {ResellerResponseDto} from '../../resellers/dto/reseller-response.dto'
import {internal} from '../../../entities'
import {ApiHideProperty, ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {RbacRole} from '../../../config/constants.config'
import {ResponseDto} from '../../../dto/response.dto'

export class AdminResponseDto implements ResponseDto {
    @ApiProperty()
        billing_data: boolean
    @ApiProperty()
        call_data: boolean
    @ApiProperty()
        can_reset_password: boolean
    @ApiProperty()
        email: string
    @ApiProperty()
        id: number
    @ApiProperty()
        is_active: boolean
    @ApiProperty()
        is_ccare: boolean
    @ApiProperty()
        is_master: boolean
    @ApiProperty()
        is_superuser: boolean
    @ApiProperty()
        is_system: boolean
    @ApiProperty()
        lawful_intercept: boolean
    @ApiProperty()
        login: string
    @ApiProperty()
        read_only: boolean
    @ApiPropertyOptional()
        reseller_id?: number
    @ApiHideProperty()
        reseller_id_expand?: ResellerResponseDto
    @ApiProperty()
        role: RbacRole
    @ApiProperty()
        show_passwords: boolean

    constructor(admin: internal.Admin, role: RbacRole) {
        this.billing_data = admin.billing_data
        this.call_data = admin.call_data
        this.can_reset_password = admin.can_reset_password
        this.email = admin.email
        this.id = admin.id
        this.is_active = admin.is_active
        this.is_ccare = admin.is_ccare
        this.is_master = admin.is_master
        this.is_superuser = admin.is_superuser
        this.is_system = admin.is_system
        this.lawful_intercept = admin.lawful_intercept
        this.login = admin.login
        this.read_only = admin.read_only
        this.role = admin.role
        this.show_passwords = admin.show_passwords

        if ([RbacRole.admin, RbacRole.system, RbacRole.ccareadmin].includes(role)) {
            this.reseller_id = admin.reseller_id
        }
    }
}
