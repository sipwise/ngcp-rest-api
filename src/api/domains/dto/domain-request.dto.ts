import {internal} from '../../../entities'
import {ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty, IsNumber} from 'class-validator'
import {RequestDto} from '../../../dto/request.dto'

export class DomainRequestDto implements RequestDto {
    @IsNotEmpty()
    @ApiProperty({description: 'The fully qualified domain name', example: 'sip.example.org'})
        domain: string

    @IsNotEmpty()
    @IsNumber()
    @ApiProperty({description: 'The reseller id to assign this domain to', type: 'integer'})
        reseller_id: number

    constructor(entity?: internal.Domain) {
        if (!entity)
            return

        // TODO rework as the Dto key names are not always equal to the Entity ones
        Object.keys(entity).map(key => {
            this[key] = entity[key]
        })
    }

    toInternal(): internal.Domain {
        const domain = new internal.Domain()
        domain.domain = this.domain
        domain.reseller_id = this.reseller_id
        return domain
    }
}
