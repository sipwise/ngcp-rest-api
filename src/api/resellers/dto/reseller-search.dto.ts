import {ResellerStatus} from '../../../entities/internal/reseller.internal.entity'
import {ContractResponseDto} from '../../contracts/dto/contract-response.dto'

export class ResellerSearchDto {
    id: number = undefined
    contract_id: number = undefined
    name?: string = undefined
    status?: ResellerStatus = undefined
}
