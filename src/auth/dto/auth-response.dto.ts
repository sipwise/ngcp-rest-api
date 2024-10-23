import {internal} from '~/entities'

export class AuthResponseDto {
    active: boolean
    id: number
    readOnly: boolean
    reseller_id: number
    role: string
    role_data?: internal.AclRole
    reseller_id_required: boolean
    showPasswords: boolean
    username: string
    is_master: boolean
    uuid?: string
    customer_id?: number
    password_modified_timestamp?: Date
}
