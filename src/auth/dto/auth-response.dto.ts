interface AuthResponseDtoAttributes {
    active: boolean;
    id: number;
    readOnly: boolean;
    reseller_id: number;
    role: string;
    showPasswords: boolean;
    ssl_client_certificate: string;
    ssl_client_m_serial: number;
    username: string;
}

export class AuthResponseDto implements AuthResponseDtoAttributes {
    active: boolean
    id: number
    readOnly: boolean
    reseller_id: number;
    role: string
    showPasswords: boolean
    ssl_client_certificate: string
    ssl_client_m_serial: number
    username: string
}
