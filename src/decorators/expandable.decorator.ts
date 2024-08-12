import {applyDecorators, SetMetadata} from '@nestjs/common'
import {ApiProperty, ApiPropertyOptions} from '@nestjs/swagger'

export type ExpandableOptions = ApiPropertyOptions & {
    controller: string
}

export function Expandable(options: ExpandableOptions) {
    return function (target: object, propertyKey: string | symbol) {
        options.name = `${options?.name || ''} (expandable)`.trim()
        applyDecorators(
            ApiProperty(options),
            SetMetadata(`${String(propertyKey)}:isExpandable`, true),
            SetMetadata(`${String(propertyKey)}:controller`, options.controller),
        )(target, propertyKey)
    }
}
