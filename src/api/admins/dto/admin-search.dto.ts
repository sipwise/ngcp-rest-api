import {AdminResponseDto} from './admin-response.dto'

export class AdminSearchDto implements AdminResponseDto {
    billing_data: boolean = undefined
    call_data: boolean = undefined
    can_reset_password: boolean = undefined
    email: string = undefined
    id: number = undefined
    is_active: boolean = undefined
    is_ccare: boolean = undefined
    is_master: boolean = undefined
    is_superuser: boolean = undefined
    is_system: boolean = undefined
    lawful_intercept: boolean = undefined
    login: string = undefined
    read_only: boolean = undefined
    reseller_id?: number = undefined
    role: string = undefined
    show_passwords: boolean = undefined
}
