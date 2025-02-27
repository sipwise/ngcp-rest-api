import {ApiProperty} from '@nestjs/swagger'
import {IsInt, IsNotEmpty, IsString} from 'class-validator'

import {Expandable} from '~/decorators/expandable.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'

export class ResellerPhonebookResponseDto implements ResponseDto {
    @IsInt()
    @ApiProperty()
        id: number

    @IsInt()
    @ApiProperty()
    @Expandable({name:'reseller_id', controller: 'resellerController'})
        reseller_id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        name: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        number: string

    constructor(entity: internal.ResellerPhonebook) {
        this.id = entity.id
        this.reseller_id = entity.resellerId
        this.name = entity.name
        this.number = entity.number
    }
}