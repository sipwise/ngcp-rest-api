import {Exclude} from 'class-transformer'

import {prepareUrlReference} from '~/helpers/uri.helper'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export abstract class ResponseDto {
    @Exclude()
    readonly resourceUrl?: string = ''
    constructor(options?: ResponseDtoOptions) {
        if (!options)
            return
        const stripResourceId = options?.containsResourceId ? true : false
        this.resourceUrl = prepareUrlReference(options.url, stripResourceId)
    }
}