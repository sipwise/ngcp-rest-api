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
            (error => new HttpErrorByCode[errorHttpStatusCode](error))
    }
    async transform(value: any, metadata: ArgumentMetadata): Promise<number[]> {
        const parseId = new ParseIntPipe(this.options)
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