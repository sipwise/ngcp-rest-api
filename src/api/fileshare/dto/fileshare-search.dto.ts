import {FileshareResponseDto} from '~/api/fileshare/dto/fileshare-response.dto'

export class FileshareSearchDto implements FileshareResponseDto {
    id: string = undefined
    name: string = undefined
    mime_type: string = undefined
    ttl: number = undefined
    size: number = undefined
    created_at: Date = undefined
    expires_at: Date = undefined
    subscriber_id?: number = undefined
    reseller_id?: number = undefined
}
