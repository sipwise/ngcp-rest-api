interface AuthResponseDtoAttributes {
    id: number;
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
    can_reset_password: boolean;
    is_system: boolean;
    ssl_client_certificate: string;
    ssl_client_m_serial: number;
}

export class AuthResponseDto implements AuthResponseDtoAttributes {
    billing_data: boolean
    call_data: boolean
    can_reset_password: boolean
    id: number
    is_active: boolean
    is_ccare: boolean
    is_master: boolean
    is_superuser: boolean
    is_system: boolean
    lawful_intercept: boolean
    login: string
    read_only: boolean
    show_passwords: boolean
    ssl_client_certificate: string
    ssl_client_m_serial: number
}
