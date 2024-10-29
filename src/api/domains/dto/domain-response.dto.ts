import {ApiProperty} from '@nestjs/swagger'

import {Expandable} from '~/decorators/expandable.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'

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

