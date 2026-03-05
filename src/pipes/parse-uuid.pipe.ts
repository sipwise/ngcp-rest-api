// TODO: Check if full type safety is possible in pipes
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    ArgumentMetadata,
    HttpStatus,
    Injectable,
    Optional,
    ParseUUIDPipe as UUIDPipe,
    ParseUUIDPipeOptions,
    PipeTransform,
} from '@nestjs/common'
import {HttpErrorByCode} from '@nestjs/common/utils/http-error-by-code.util'

interface ParseUUIDIdPipeOptions extends ParseUUIDPipeOptions {
    allowUndefined?: boolean
}

@Injectable()
export class ParseUUIDPipe implements PipeTransform {
    private readonly version: '3' | '4' | '5' | '7' | undefined
    protected exceptionFactory: (errors: string) => any

    constructor(
        @Optional() protected readonly options?: ParseUUIDIdPipeOptions,
    ) {
        options = options || {}
        const {
            version,
            exceptionFactory,
            errorHttpStatusCode = HttpStatus.BAD_REQUEST,
        } = options

        this.version = version
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
