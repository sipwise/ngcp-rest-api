import {
    ArgumentMetadata,
    HttpStatus,
    Optional,
    ParseUUIDPipeOptions,
    ParseUUIDPipe as UUIDPipe,
    PipeTransform,
} from '@nestjs/common'
import {HttpErrorByCode} from '@nestjs/common/utils/http-error-by-code.util'

interface ParseUUIDIdPipeOptions extends ParseUUIDPipeOptions {
    allowUndefined?: boolean
}

export class ParseUUIDPipe implements PipeTransform {
    protected exceptionFactory: (errors: string) => any
    private readonly options: ParseUUIDIdPipeOptions

    constructor(
        @Optional() options?: ParseUUIDIdPipeOptions,
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

    async transform(value: any, metadata: ArgumentMetadata): Promise<string> {
        const parseId = new UUIDPipe(this.options)
        if (value == undefined && this.options.allowUndefined) {
            return undefined
        }
        return await parseId.transform(value, metadata)
    }
}
