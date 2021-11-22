import {AuthResponseDto} from '../auth/dto/auth-response.dto'

export interface ServiceRequest {
    params: [any],
    user: AuthResponseDto | any, // TODO: fix typing
    headers: [any],
    query?: any
}
