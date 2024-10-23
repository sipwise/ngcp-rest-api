import {ContractResponseDto} from './contract-response.dto'
import {
    ContractBillingProfileDefinition,
    ContractStatus,
    ContractType,
} from '../../../entities/internal/contract.internal.entity'

export class ContractSearchDto implements ContractResponseDto {
    id: number = undefined
    billing_profile_definition: ContractBillingProfileDefinition = undefined
    billing_profile_id: number = undefined
    contact_id?: number = undefined
    external_id: string = undefined
    status?: ContractStatus = undefined
    type?: ContractType = undefined
}
