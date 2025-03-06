import {ApiProperty} from '@nestjs/swagger'
import {Type} from 'class-transformer'

import {ResponseDto} from '~/dto/response.dto'
import {UrlReferenceType} from '~/enums/url-reference-type.enum'
import {ResponseDtoOptions} from '~/types/response-dto-options'
import {UrlReference} from '~/types/url-reference.type'

export class SubscriberResponseDto extends ResponseDto {
    @Type(() => UrlReference)
    @ApiProperty()
        phonebook: UrlReference


    constructor(options?: ResponseDtoOptions) {
        super(options)
        this.phonebook = {
            type: UrlReferenceType.Link,
            url: `${this.resourceUrl}/phonebook`,
        }
    }
}
