import {ArgumentMetadata, Injectable, Optional, PipeTransform} from '@nestjs/common'

import {paramOrBodyFromBody} from '~/decorators/param-or-body.decorator'
import {parameterException} from '~/helpers/errors.helper'
import {isIntId} from '~/pipes/parse-int-id.pipe'

interface ParseIntArrayPipeOptions {
    allowUndefined?: boolean
}

@Injectable()
export class ParseIntIdArrayPipe implements PipeTransform {
    private readonly options: ParseIntArrayPipeOptions

    constructor(
        @Optional() options?: ParseIntArrayPipeOptions,
    ) {
        this.options = options || {}
    }

    async transform(value: unknown, metadata: ArgumentMetadata): Promise<number[]> {
        if (!Array.isArray(value) && this.options.allowUndefined) {
            return undefined
        }
        const name = metadata.data ?? 'id'
        const fromBody = value != null && typeof value == 'object' && paramOrBodyFromBody.has(value)
        if (!Array.isArray(value))
            throw parameterException(name, 'isArray', `${name} must be an array`, fromBody ? '' : undefined)
        const index = value.findIndex(val => !isIntId(val))
        if (index >= 0)
            throw parameterException(name, 'isInt', `${name} must be an integer number`, fromBody ? `/${index}` : undefined)
        return value as number[]
    }
}
