import {ArgumentMetadata, HttpStatus, Optional, ParseIntPipe, ParseIntPipeOptions, PipeTransform} from '@nestjs/common'
import {HttpErrorByCode} from '@nestjs/common/utils/http-error-by-code.util'

interface ParseIntIdPipeOptions extends ParseIntPipeOptions {
    allowUndefined?: boolean
}

export class ParseIntIdPipe implements PipeTransform {
    protected exceptionFactory: (errors: string) => any
    private readonly options: ParseIntIdPipeOptions

    constructor(
        @Optional() options?: ParseIntIdPipeOptions,
    ) {
        this.options = options || {}
        const {
            exceptionFactory,
            errorHttpStatusCode = HttpStatus.BAD_REQUEST,
        } = options
        this.exceptionFactory =
            exceptionFactory ||
            (error => new HttpErrorByCode[errorHttpStatusCode](error))
    }

    async transform(value: any, metadata: ArgumentMetadata): Promise<number> {
        const parseId = new ParseIntPipe(this.options)
        if (value == undefined && this.options.allowUndefined) {
            return undefined
        }
        return await parseId.transform(value, metadata)
    }
}