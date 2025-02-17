import {ApiProperty} from '@nestjs/swagger'
import {IsInt, IsNotEmpty, IsString} from 'class-validator'

import {Expandable} from '~/decorators/expandable.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'

export class BanAdminResponseDto implements ResponseDto {
    @IsInt()
    @ApiProperty()
        id: number

    @IsInt()
    @ApiProperty()
    @Expandable({name: 'reseller_id', controller: 'resellerController'})
        reseller_id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        username: string

    constructor(entity: internal.BanAdmin) {
        this.id = entity.id
        this.reseller_id = entity.resellerId
        this.username = entity.username
    }
}