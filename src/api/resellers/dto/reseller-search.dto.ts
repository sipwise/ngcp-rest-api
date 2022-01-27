import {ResellerStatus} from './reseller-base.dto'
import {ResellerResponseDto} from './reseller-response.dto'

export class ResellerSearchDto implements ResellerResponseDto {
    id: number = undefined
    contract_id: number = undefined
    name?: string = undefined
    status?: ResellerStatus = undefined
}
