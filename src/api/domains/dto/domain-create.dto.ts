import {internal} from '../../../entities'
import {ApiProperty} from '@nestjs/swagger'

export class DomainCreateDto {
    @ApiProperty({description: 'The fully qualified domain name', example: 'sip.example.org'})
        domain: string
    @ApiProperty({description: 'The reseller id to assign this domain to', type: 'integer'})
        reseller_id: number

    toInternal(): internal.Domain {
        const domain = new internal.Domain()
        domain.domain = this.domain
        domain.reseller_id = this.reseller_id
        return domain
    }
}
