// TODO: Check if full type safety is possible in pipes
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
    ArgumentMetadata,
    BadRequestException,
    HttpStatus,
    Injectable,
    Optional, ParseUUIDPipe, ParseUUIDPipeOptions,
    PipeTransform,
} from '@nestjs/common'
import {HttpErrorByCode} from '@nestjs/common/utils/http-error-by-code.util'

interface ParseUuidArrayPipeOptions extends ParseUUIDPipeOptions {
    allowUndefined?: boolean
}

@Injectable()
export class ParseUUIDArrayPipe implements PipeTransform {
    private readonly version: '3' | '4' | '5' | '7' | undefined
    protected exceptionFactory: (errors: string) => any

    constructor(
        @Optional() protected readonly options?: ParseUuidArrayPipeOptions,
    ) {
        options = options || {}
        const {
            version,
            exceptionFactory,
            errorHttpStatusCode = HttpStatus.BAD_REQUEST,
        } = options

        this.version = version
        this.options = options
        this.exceptionFactory =
            exceptionFactory ||
            // TODO: Fix the return type
            // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
            (error => new HttpErrorByCode[errorHttpStatusCode](error))
    }
    async transform(value: any, metadata: ArgumentMetadata): Promise<string[]> {
        const parseId = new ParseUUIDPipe(this.options)
        if (!Array.isArray(value) && this.options.allowUndefined) {
            return undefined
        }
        if (!Array.isArray(value))
            throw new BadRequestException('is no array')
        for (const val of value) {
            if(!await parseId.transform(val, metadata))
                throw new BadRequestException('element is no int')
        }
        return value
    }
}
