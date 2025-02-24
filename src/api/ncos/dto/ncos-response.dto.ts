import {ApiProperty} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {IsArray, ValidateNested} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {UrlReferenceType} from '~/enums/url-reference-type.enum'
import {UrlReference} from '~/types/url-reference.type'

export class NCOSResponseDto implements ResponseDto {
    @IsArray()
    @ValidateNested({each: true})
    @Type(() => UrlReference)
    @ApiProperty()
        links: UrlReference[]

    constructor(prefix: string) {
        const url = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
        this.links = [
            {type: UrlReferenceType.Link, url: `${url}/sets`},
            {type: UrlReferenceType.Link, url: `${url}/sets/levels`},
        ]
    }
}