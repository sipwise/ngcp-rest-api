import {AclRole} from '../../entities/db/billing'

export class AuthResponseDto {
    active: boolean
    id: number
    readOnly: boolean
    reseller_id: number
    role: string
    role_data: AclRole
    reseller_id_required: boolean
    showPasswords: boolean
    ssl_client_certificate: string
    ssl_client_m_serial: number
    username: string
    is_master: boolean
}
