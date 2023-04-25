import {internal} from '../../../entities'
import {ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty, IsNumber} from 'class-validator'

export class DomainCreateDto {
    @IsNotEmpty()
    @ApiProperty({description: 'The fully qualified domain name', example: 'sip.example.org'})
        domain: string

    @IsNotEmpty()
    @IsNumber()
    @ApiProperty({description: 'The reseller id to assign this domain to', type: 'integer'})
        reseller_id: number

    toInternal(): internal.Domain {
        const domain = new internal.Domain()
        domain.domain = this.domain
        domain.reseller_id = this.reseller_id
        return domain
    }
}
