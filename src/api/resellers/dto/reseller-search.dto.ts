import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'

export class ResellerSearchDto {
    contract_id: number = undefined
    name?: string = undefined
    status?: ResellerStatus = undefined
    _alias = {
        id: 'reseller.id',
    }
}
