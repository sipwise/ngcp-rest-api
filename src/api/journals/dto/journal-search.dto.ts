import {JournalResponseDto} from './journal-response.dto'

export class JournalSearchDto implements JournalResponseDto {
    id: number = undefined
    content?: Uint8Array = undefined
    content_format: string = undefined
    operation: string = undefined
    reseller_id: number = undefined
    resource_id: number = undefined
    resource_name: string = undefined
    role_id: number | null = undefined
    timestamp: number = undefined
    tx_id: string = undefined
    username: string = undefined
    user_id: number = undefined
}
