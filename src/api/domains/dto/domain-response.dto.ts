import {ApiProperty} from '@nestjs/swagger'
import {IsInt, IsString} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class DomainResponseDto extends ResponseDto {
    @IsString()
    @ApiProperty({description: 'Fully qualified domain name'})
        domain: string

    @IsInt()
    @ApiProperty({description: 'Id of the domain'})
        id: number

    @IsInt()
    @ApiProperty({description: 'Reseller of the domain; required for admin roles, the own reseller for reseller roles'})
        reseller_id: number

    constructor(domain: internal.Domain, options?: ResponseDtoOptions) {
        super(options)
        this.domain = domain.domain
        this.id = domain.id
        this.reseller_id = domain.reseller_id
    }
}

