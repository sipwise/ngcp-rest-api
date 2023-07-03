import {ResponseDto} from '../../../dto/response.dto'

export class FileshareResponseDto implements ResponseDto {
    id: string
    name: string
    mime_type: string
    ttl: number
    size: number
    created_at: Date
    expires_at: Date
    subscriber_id?: number
    reseller_id?: number
}
