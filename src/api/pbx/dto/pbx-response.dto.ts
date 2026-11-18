import {ApiProperty} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {IsArray, ValidateNested} from 'class-validator'

import {NotLazy} from '~/decorators/lazy.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {UrlReferenceType} from '~/enums/url-reference-type.enum'
import {ResponseDtoOptions} from '~/types/response-dto-options'
import {UrlReference} from '~/types/url-reference.type'

export class PbxResponseDto extends ResponseDto {
    @IsArray()
    @ValidateNested({each: true})
    @Type(() => UrlReference)
    @NotLazy()
    @ApiProperty({description: 'Links to the nested resources'})
        links: UrlReference[]

    constructor(options?: ResponseDtoOptions) {
        super(options)
        this.links = [
            {type: UrlReferenceType.Link, url: `${this.resourceUrl}/groups`},
            {type: UrlReferenceType.Link, url: `${this.resourceUrl}/groups/members`},
            {type: UrlReferenceType.Link, url: `${this.resourceUrl}/users`},
        ]
    }
}
