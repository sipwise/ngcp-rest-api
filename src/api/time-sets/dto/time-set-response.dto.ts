import {ApiProperty} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {IsInt, IsNotEmpty, IsString, ValidateNested} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {UrlReferenceType} from '~/enums/url-reference-type.enum'
import {ResponseDtoOptions} from '~/types/response-dto-options'
import {UrlReference} from '~/types/url-reference.type'

export class TimeSetResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty({description: 'Id of the time set'})
        id: number

    @IsInt()
    @ApiProperty({description: 'Reseller of the time set; required for admin roles, the own reseller for reseller roles'})
        reseller_id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Name of the time set, unique across all resellers'})
        name: string

    @ValidateNested()
    @Type(() => UrlReference)
    @ApiProperty({description: 'Events of the time set'})
        events: UrlReference

    constructor(entity: internal.TimeSet, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id
        this.reseller_id = entity.resellerId
        this.name = entity.name
        this.events = {
            type: UrlReferenceType.Link,
            url: `${this.resourceUrl}/${entity.id}/events`,
        }
    }
}
