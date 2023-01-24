import {
    ArgumentMetadata,
    BadRequestException,
    HttpStatus,
    Injectable,
    Optional, ParseIntPipe,
    ParseIntPipeOptions,
    PipeTransform,
} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'
import {HttpErrorByCode} from '@nestjs/common/utils/http-error-by-code.util'
import {ParseIdPipe, ParseIdPipeOptions} from './parse-id.pipe'
import {options} from 'yargs'

@Injectable()
export class ParseIntArrayPipe implements PipeTransform {
    protected exceptionFactory: (errors: string) => any
    private options: ParseIntPipeOptions
    constructor(
        @Optional() options?: ParseIntPipeOptions,
    ) {
        options = options || {}
        const {
            exceptionFactory,
            errorHttpStatusCode = HttpStatus.BAD_REQUEST,
        } = options

        this.exceptionFactory =
            exceptionFactory ||
            (error => new HttpErrorByCode[errorHttpStatusCode](error))
    }
    async transform(value: any, metadata: ArgumentMetadata): Promise<number[]> {
        const parseId = new ParseIntPipe(this.options)
        if (!Array.isArray(value))
            throw new BadRequestException('is no array')
        for (const val of value) {
            if(!await parseId.transform(val, metadata))
                throw new BadRequestException('element is no int')
        }
        return value
    }
}