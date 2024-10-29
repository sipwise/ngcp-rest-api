import {
    ArgumentMetadata,
    HttpStatus,
    Optional,
    ParseUUIDPipe as UUIDPipe,
    ParseUUIDPipeOptions,
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
            // TODO: Fix the return type
            // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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
