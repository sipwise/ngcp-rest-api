export class JournalResponseDto {
    id: number
    content?: string | Buffer
    content_format: string
    operation: string
    reseller_id: number
    resource_id: number
    resource_name: string
    role_id: number | null
    timestamp: number
    tx_id: string
    username: string
    user_id: number
}
