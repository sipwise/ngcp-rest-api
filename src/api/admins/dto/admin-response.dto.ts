interface AdminResponseDtoAttributes {
    id: number;
    reseller_id?: number;
    login: string;
    is_master: boolean;
    is_superuser: boolean;
    is_ccare: boolean;
    is_active: boolean;
    read_only: boolean;
    show_passwords: boolean;
    call_data: boolean;
    billing_data: boolean;
    lawful_intercept: boolean;
    email: string;
    can_reset_password: boolean;
    is_system: boolean;
}

export class AdminResponseDto implements AdminResponseDtoAttributes {
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
    show_passwords: boolean
}
