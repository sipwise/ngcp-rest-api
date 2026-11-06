import {ArgumentMetadata, Optional, PipeTransform} from '@nestjs/common'

import {parameterException} from '~/helpers/errors.helper'

interface ParseIntIdPipeOptions {
    allowUndefined?: boolean
}

export function isIntId(value: unknown): boolean {
    return (typeof value == 'number' && Number.isInteger(value)) || (typeof value == 'string' && /^-?\d+$/.test(value))
}

export class ParseIntIdPipe implements PipeTransform {
    private readonly options: ParseIntIdPipeOptions

    constructor(
        @Optional() options?: ParseIntIdPipeOptions,
    ) {
        this.options = options || {}
    }

    async transform(value: unknown, metadata: ArgumentMetadata): Promise<number> {
        if (value == undefined && this.options.allowUndefined) {
            return undefined
        }
        const name = metadata.data ?? 'id'
        if (!isIntId(value))
            throw parameterException(name, 'isInt', `${name} must be an integer number`)
        return +value
    }
}
