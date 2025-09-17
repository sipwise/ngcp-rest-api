import {Type} from 'class-transformer'
import {IsBoolean, IsInt, IsNumber, ValidateNested} from 'class-validator'

class SecurityLoginConfig {
    @IsBoolean()
        ban_enable: boolean

    @IsNumber()
        ban_min_time: number

    @IsNumber()
        ban_max_time: number

    @IsNumber()
        ban_increment: number

    @IsNumber()
        max_attempts: number
}

class SecurityPasswordConfig {
    @IsBoolean()
        allow_recovery: boolean

    @IsNumber()
        max_length: number

    @IsNumber()
        min_length: number

    @IsNumber()
        musthave_digit: number

    @IsNumber()
        musthave_lowercase: number

    @IsNumber()
        musthave_specialchar: number

    @IsNumber()
        musthave_uppercase: number

    @IsBoolean()
        sip_autogenerate: boolean

    @IsBoolean()
        sip_expose_subadmin: boolean

    @IsBoolean()
        sip_validate: boolean
    @IsBoolean()
        web_autogenerate: boolean

    @IsBoolean()
        web_expose_subadmin: boolean

    @IsBoolean()
        web_validate: boolean

    @IsNumber()
        web_keep_last_used: number

    @IsNumber()
        web_max_age_days: number
}

class SecurityKamailioLbConfig {
    @IsInt()
        failed_auth_attempts: number
}

class SecurityKamailioConfig {
    @ValidateNested()
    @Type(() => SecurityKamailioLbConfig)
        lb: SecurityKamailioLbConfig
}

export class SecurityConfig {
    @ValidateNested()
    @Type(() => SecurityLoginConfig)
        login: SecurityLoginConfig

    @ValidateNested()
    @Type(() => SecurityPasswordConfig)
        password: SecurityPasswordConfig

    @ValidateNested()
    @Type(() => SecurityKamailioConfig)
        kamailio: SecurityKamailioConfig
}