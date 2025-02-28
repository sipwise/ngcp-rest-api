import {ApiProperty} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {IsArray, ValidateNested} from 'class-validator'

import {ResponseDto} from '~/dto/response.dto'
import {UrlReferenceType} from '~/enums/url-reference-type.enum'
import {ResponseDtoOptions} from '~/types/response-dto-options'
import {UrlReference} from '~/types/url-reference.type'

export class HeaderManipulationResponseDto extends ResponseDto {
    @IsArray()
    @ValidateNested({each: true})
    @Type(() => UrlReference)
    @ApiProperty()
        links: UrlReference[]

    constructor(options?: ResponseDtoOptions) {
        super(options)
        this.links = [
            {type: UrlReferenceType.Link, url: `${this.resourceUrl}/sets`},
            {type: UrlReferenceType.Link, url: `${this.resourceUrl}/sets/rules`},
            {type: UrlReferenceType.Link, url: `${this.resourceUrl}/sets/rules/actions`},
            {type: UrlReferenceType.Link, url: `${this.resourceUrl}/sets/rules/conditions`},
            {type: UrlReferenceType.Link, url: `${this.resourceUrl}/sets/rules/conditions/:id/@values`},
        ]
    }
}