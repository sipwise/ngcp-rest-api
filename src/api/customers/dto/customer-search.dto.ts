import {
    ContractBillingProfileDefinition,
    ContractStatus,
    ContractType,
} from '../../../entities/internal/contract.internal.entity'
import {CustomerResponseDto} from './customer-response.dto'

export class CustomerSearchDto {
    id: number = undefined
    billing_profile_id: number = undefined
    contact_id?: number = undefined
    external_id: string = undefined
    status?: ContractStatus = undefined
    // type?: ContractType = undefined
}
