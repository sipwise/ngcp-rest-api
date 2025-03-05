/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {ArgumentMetadata, HttpStatus, Optional, PipeTransform} from '@nestjs/common'
import {HttpErrorByCode} from '@nestjs/common/utils/http-error-by-code.util'

interface ParseRegexPipeOptions {
    pattern: RegExp;
    allowUndefined?: boolean;
    exceptionFactory?: (errors: string) => unknown;
    errorHttpStatusCode?: HttpStatus;
}

export class ParseRegexPipe implements PipeTransform {
    protected exceptionFactory: (errors: string) => any
    private readonly options: ParseRegexPipeOptions

    constructor(@Optional() options?: ParseRegexPipeOptions) {
        if (!options?.pattern) {
            throw new Error('ParseRegexPipe requires a regex pattern.')
        }
        this.options = options
        const {exceptionFactory, errorHttpStatusCode = HttpStatus.BAD_REQUEST} = options
        this.exceptionFactory = exceptionFactory || ((error) => new HttpErrorByCode[errorHttpStatusCode](error))
    }

    async transform(value: unknown, _metadata: ArgumentMetadata): Promise<string | undefined> {
        if (value == null || value === '') {
            return undefined
        }

        if (typeof value !== 'string') {
            throw this.exceptionFactory(`Validation failed: expected a string, got ${typeof value}`)
        }

        if (!this.options.pattern.test(value)) {
            throw this.exceptionFactory(`Validation failed: '${value}' does not match pattern ${this.options.pattern}`)
        }

        return value
    }
}
