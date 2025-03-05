import {ApiProperty} from '@nestjs/swagger'
import {IsInt, IsNotEmpty, IsString} from 'class-validator'

import {Expandable} from '~/decorators/expandable.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class CustomerPhonebookResponseDto extends ResponseDto {
    @IsString()
    @ApiProperty()
        id: string

    @IsInt()
    @ApiProperty()
    @Expandable({name:'customer_id', controller: 'contractController'})
        customer_id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        name: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        number: string

    constructor(entity: internal.CustomerPhonebook | internal.VCustomerPhonebook, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id.toString()
        this.customer_id = entity.contractId
        this.name = entity.name
        this.number = entity.number
    }
}