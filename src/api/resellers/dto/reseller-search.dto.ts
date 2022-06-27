import {ResellerStatus} from '../../../entities/internal/reseller.internal.entity'

export class ResellerSearchDto {
    id: number = undefined
    contract_id: number = undefined
    name?: string = undefined
    status?: ResellerStatus = undefined
}
