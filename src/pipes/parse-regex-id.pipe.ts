import {ArgumentMetadata, Optional, PipeTransform} from '@nestjs/common'

import {parameterException} from '~/helpers/errors.helper'

interface ParseRegexPipeOptions {
    pattern: RegExp;
    allowUndefined?: boolean;
}

export class ParseRegexPipe implements PipeTransform {
    private readonly options: ParseRegexPipeOptions

    constructor(@Optional() options?: ParseRegexPipeOptions) {
        if (!options?.pattern) {
            throw new Error('ParseRegexPipe requires a regex pattern.')
        }
        this.options = options
    }

    async transform(value: unknown, metadata: ArgumentMetadata): Promise<string | undefined> {
        if (value == null || value === '') {
            return undefined
        }
        const name = metadata.data ?? 'id'
        if (typeof value !== 'string' || !this.options.pattern.test(value))
            throw parameterException(name, 'matches', `${name} must match ${this.options.pattern} regular expression`)
        return value
    }
}
