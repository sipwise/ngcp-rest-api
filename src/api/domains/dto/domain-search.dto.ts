import {DomainResponseDto} from './domain-response.dto'

export class DomainSearchDto implements DomainResponseDto {
    domain: string = undefined
    id: number = undefined
    reseller_id: number = undefined
}
