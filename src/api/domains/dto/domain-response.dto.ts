import {internal} from '../../../entities'
import {ApiProperty} from '@nestjs/swagger'
import {ResponseDto} from '../../../dto/response.dto'
import {Expandable} from '../../../decorators/expandable.decorator'

export class DomainResponseDto implements ResponseDto {
    @ApiProperty()
        domain: string
    @ApiProperty()
        id: number
    @ApiProperty()
    @Expandable({name: 'reseller_id', controller: 'resellerController'})
        reseller_id: number

    constructor(domain: internal.Domain) {
        this.domain = domain.domain
        this.id = domain.id
        this.reseller_id = domain.reseller_id
    }
}

