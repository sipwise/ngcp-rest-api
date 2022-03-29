import {internal} from '../../../entities'
import {ApiProperty} from '@nestjs/swagger'
import {ResellerResponseDto} from '../../resellers/dto/reseller-response.dto'
interface DomainResponseDtoAttributes {
    id: number;
    domain: string;
    reseller_id: number;
}

export class DomainResponseDto implements DomainResponseDtoAttributes {
    @ApiProperty()
    domain: string
    @ApiProperty()
    id: number
    @ApiProperty()
    reseller_id: number
    @ApiProperty()
    reseller_id_expand?: ResellerResponseDto

    constructor(domain: internal.Domain) {
        this.domain = domain.domain
        this.id = domain.id
        this.reseller_id = domain.reseller_id
    }
}

