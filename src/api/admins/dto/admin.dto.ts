import {AdminBaseDto} from "./admin-base.dto"

export interface AdminDto extends Partial<AdminBaseDto> {
    saltedpass?: string
    role_id?: number
    is_system?: boolean
    is_superuser?: boolean
    is_ccare?: boolean
    lawful_intercept?: boolean
}
