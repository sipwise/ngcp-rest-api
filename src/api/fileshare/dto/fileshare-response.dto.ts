export class FileshareResponseDto {
    id: string
    name: string
    mime_type: string
    ttl: number
    created_at: Date
    expires_at: Date
    subscriber_id?: number
    reseller_id?: number
}