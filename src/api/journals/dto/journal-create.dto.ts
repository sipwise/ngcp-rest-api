export class JournalCreateDto {
    content?: Uint8Array
    content_format: string
    operation: string
    reseller_id: number
    resource_id: number
    resource_name: string
    role_id: number
    timestamp: number
    tx_id: string
    username: string
    user_id: number
}
