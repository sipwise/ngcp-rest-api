import {internal} from '../../../entities'
import {ApiHideProperty, ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {ResellerResponseDto} from '../../resellers/dto/reseller-response.dto'
import {ResponseDto} from '../../../dto/response.dto'

export class DomainResponseDto implements ResponseDto {
    @ApiProperty()
        domain: string
    @ApiProperty()
        id: number
    @ApiProperty()
        reseller_id: number
    @ApiHideProperty()
        reseller_id_expand?: ResellerResponseDto

    constructor(domain: internal.Domain) {
        this.domain = domain.domain
        this.id = domain.id
        this.reseller_id = domain.reseller_id
    }
}

