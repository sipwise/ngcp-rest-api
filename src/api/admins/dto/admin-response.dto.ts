export class AdminResponseDto {
    billing_data: boolean
    call_data: boolean
    can_reset_password: boolean
    email: string
    id: number
    is_active: boolean
    is_ccare: boolean
    is_master: boolean
    is_superuser: boolean
    is_system: boolean
    lawful_intercept: boolean
    login: string
    read_only: boolean
    reseller_id?: number
    role: string
    show_passwords: boolean
}
