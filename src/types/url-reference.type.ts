import {UrlReferenceType} from '~/enums/url-reference-type.enum'

export type UrlReference = {
    type: UrlReferenceType
    url: string
}