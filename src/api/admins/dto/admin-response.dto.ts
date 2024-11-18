import {ApiProperty} from '@nestjs/swagger'
import {IsBoolean, IsEnum, IsInt, IsNotEmpty, IsString} from 'class-validator'

import {RbacRole} from '~/config/constants.config'
import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {Expandable} from '~/decorators/expandable.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'

export class AdminResponseDto implements ResponseDto {
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
        this.password_last_modify_time = admin.saltedpass_modify_timestamp.toISOString()

        if ([RbacRole.admin, RbacRole.system, RbacRole.ccareadmin].includes(role)) {
            this.reseller_id = admin.reseller_id
        }
    }
}
