import {Exclude} from 'class-transformer'

import {prepareUrlReference} from '~/helpers/uri.helper'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export abstract class ResponseDto {
    @Exclude()
    protected readonly resourceUrl?: string = ''
    constructor(options?: ResponseDtoOptions) {
        const stripResourceId = options?.containsResourceId ? true : false
        this.resourceUrl = prepareUrlReference(options.url, stripResourceId)
    }
}