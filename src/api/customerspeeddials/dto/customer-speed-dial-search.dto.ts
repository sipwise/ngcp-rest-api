import {CustomerSpeedDialResponseDto} from './customer-speed-dial-response.dto'

export class CustomerSpeedDialSearchDto implements CustomerSpeedDialResponseDto {
    id: number = undefined
    customer_id: number // search is disabled by this field as one should query by the :id instead
    slot: string = undefined
    destination: string = undefined
}
