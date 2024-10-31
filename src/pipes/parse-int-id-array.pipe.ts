// TODO: Check if full type safety is possible in pipes
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
    ArgumentMetadata,
    BadRequestException,
    HttpStatus,
    Injectable,
    Optional,
    ParseIntPipe,
    ParseIntPipeOptions,
    PipeTransform,
} from '@nestjs/common'
import {HttpErrorByCode} from '@nestjs/common/utils/http-error-by-code.util'

interface ParseIntArrayPipeOptions extends ParseIntPipeOptions {
    allowUndefined?: boolean
}
@Injectable()
export class ParseIntIdArrayPipe implements PipeTransform {
    protected exceptionFactory: (errors: string) => any
    private readonly options: ParseIntArrayPipeOptions
    constructor(
        @Optional() options?: ParseIntArrayPipeOptions,
    ) {
        options = options || {}
        const {
            exceptionFactory,
            errorHttpStatusCode = HttpStatus.BAD_REQUEST,
        } = options
        this.options = options
        this.exceptionFactory =
            exceptionFactory ||
            // TODO: Fix the return type
            // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
            (error => new HttpErrorByCode[errorHttpStatusCode](error))
    }
    async transform(value: any, metadata: ArgumentMetadata): Promise<number[]> {
        const parseId = new ParseIntPipe(this.options)
        if (!Array.isArray(value) && this.options.allowUndefined) {
            return undefined
        }
        if (!Array.isArray(value))
            throw new BadRequestException('Validation failed (parsable array expected)')
        for (const val of value) {
            if(!await parseId.transform(val, metadata))
                throw new BadRequestException(`Validation failed (parsable element of type int expected; got: '${typeof val}'`)
        }
        return value
    }
}