import {ApiProperty} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {IsInt, IsNotEmpty, IsString, ValidateNested} from 'class-validator'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {PrimaryNumber} from '~/types/primary-number.type'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class PbxUserResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty({description: 'Id of the PBX user'})
        id: number

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'Name shown on provisioned phones and as network-provided display name in calls'})
        display_name: string

    @IsString()
    @ApiProperty({description: 'Extension for short dialling'})
        pbx_extension: string

    @ValidateNested()
    @Type(() => PrimaryNumber)
    @ApiProperty({description: 'Main E.164 number for inbound and outbound calls'})
        primary_number: PrimaryNumber

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'SIP username'})
        username: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Domain name'})
        domain: string

    constructor(entity: internal.PbxUser, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id
        this.display_name = entity.displayName
        this.pbx_extension = entity.pbxExtension
        this.primary_number = {
            number_id: entity.primaryNumber.number_id,
            cc: entity.primaryNumber.cc,
            ac: entity.primaryNumber.ac,
            sn: entity.primaryNumber.sn,
        }
        this.username = entity.username
        this.domain = entity.domain
    }
}