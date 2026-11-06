import {ArgumentMetadata, Injectable, Optional, ParseUUIDPipeOptions, PipeTransform} from '@nestjs/common'

import {paramOrBodyFromBody} from '~/decorators/param-or-body.decorator'
import {parameterException} from '~/helpers/errors.helper'
import {isUuidValue} from '~/pipes/parse-uuid.pipe'

interface ParseUuidArrayPipeOptions extends Pick<ParseUUIDPipeOptions, 'version'> {
    allowUndefined?: boolean
}

@Injectable()
export class ParseUUIDArrayPipe implements PipeTransform {
    constructor(
        @Optional() protected readonly options?: ParseUuidArrayPipeOptions,
    ) {
        this.options = options || {}
    }

    async transform(value: unknown, metadata: ArgumentMetadata): Promise<string[]> {
        if (!Array.isArray(value) && this.options.allowUndefined) {
            return undefined
        }
        const name = metadata.data ?? 'id'
        const fromBody = value != null && typeof value == 'object' && paramOrBodyFromBody.has(value)
        if (!Array.isArray(value))
            throw parameterException(name, 'isArray', `${name} must be an array`, fromBody ? '' : undefined)
        const index = value.findIndex(val => !isUuidValue(val, this.options.version))
        if (index >= 0)
            throw parameterException(name, 'isUuid', `${name} must be a UUID`, fromBody ? `/${index}` : undefined)
        return value as string[]
    }
}
