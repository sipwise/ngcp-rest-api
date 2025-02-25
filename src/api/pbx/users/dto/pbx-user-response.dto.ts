import {ApiProperty} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {IsInt, IsString, ValidateNested} from 'class-validator'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {PrimaryNumber} from '~/types/primary-number.type'

export class PbxUserResponseDto implements ResponseDto {
    @IsInt()
    @ApiProperty()
        id: number

    @CanBeNull()
    @IsString()
    @ApiProperty()
        display_name: string

    @IsString()
    @ApiProperty()
        pbx_extension: string

    @ValidateNested()
    @Type(() => PrimaryNumber)
    @ApiProperty()
        primary_number: PrimaryNumber

    constructor(entity: internal.PbxUser) {
        this.id = entity.id
        this.display_name = entity.displayName
        this.pbx_extension = entity.pbxExtension
        this.primary_number = {
            number_id: entity.primaryNumber.number_id,
            cc: entity.primaryNumber.cc,
            ac: entity.primaryNumber.ac,
            sn: entity.primaryNumber.sn,
        }
    }
}