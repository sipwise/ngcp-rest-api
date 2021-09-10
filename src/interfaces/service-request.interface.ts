import {AuthResponseDto} from '../auth/dto/auth-response.dto'

export interface ServiceRequest {
    params: [any],
    user: any | AuthResponseDto, // TODO: fix typing
    headers: [any]
}
