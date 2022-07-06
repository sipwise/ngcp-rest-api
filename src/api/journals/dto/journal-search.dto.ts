import {JournalResponseDto} from './journal-response.dto'
import {ResellerResponseDto} from '../../resellers/dto/reseller-response.dto'

export class JournalSearchDto implements JournalResponseDto {
    id: number = undefined
    content?: string | Buffer = undefined
    content_format: string = undefined
    operation: string = undefined
    reseller_id: number = undefined
    reseller_id_expand: ResellerResponseDto = undefined
    resource_id: number = undefined
    resource_name: string = undefined
    role: string | null = undefined
    timestamp: number = undefined
    tx_id: string = undefined
    username: string = undefined
    user_id: number = undefined
}
