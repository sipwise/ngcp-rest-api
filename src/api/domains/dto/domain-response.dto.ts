import {ApiProperty} from '@nestjs/swagger'
import {IsInt, IsString} from 'class-validator'

import {Expandable} from '~/decorators/expandable.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class DomainResponseDto extends ResponseDto {
    @IsString()
    @ApiProperty()
        domain: string

    @IsInt()
    @ApiProperty()
        id: number

    @IsInt()
    @ApiProperty()
    @Expandable({name: 'reseller_id', controller: 'resellerController'})
        reseller_id: number

    constructor(domain: internal.Domain, options?: ResponseDtoOptions) {
        super(options)
        this.domain = domain.domain
        this.id = domain.id
        this.reseller_id = domain.reseller_id
    }
}

