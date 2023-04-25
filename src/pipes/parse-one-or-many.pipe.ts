import {ArgumentMetadata, HttpStatus, ParseArrayOptions, ParseArrayPipe, PipeTransform} from '@nestjs/common'
import {HttpErrorByCode} from '@nestjs/common/utils/http-error-by-code.util'

export class ParseOneOrManyPipe implements PipeTransform {
    protected exceptionFactory: (error: string) => any

    constructor(protected readonly options: ParseArrayOptions) {
        this.options = options
        this.options.whitelist = true
        this.options.forbidNonWhitelisted = true

        const {exceptionFactory, errorHttpStatusCode = HttpStatus.UNPROCESSABLE_ENTITY} =
            options
        this.exceptionFactory =
            exceptionFactory ||
            (error => new HttpErrorByCode[errorHttpStatusCode](error))
        this.options.exceptionFactory = this.exceptionFactory
    }

    async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
        const arrayPipe = new ParseArrayPipe(this.options)
        if (!Array.isArray(value))
            value = [value]
        return arrayPipe.transform(value, metadata)
    }
}
