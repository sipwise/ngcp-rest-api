import {AdminBaseDto} from './admin-base.dto'
import {ResellerResponseDto} from '../../resellers/dto/reseller-response.dto'

export interface AdminDto extends Partial<AdminBaseDto> {
    saltedpass?: string
    role_id?: number
    is_system?: boolean
    is_superuser?: boolean
    is_ccare?: boolean
    lawful_intercept?: boolean
    reseller_id_expand?: ResellerResponseDto
}
