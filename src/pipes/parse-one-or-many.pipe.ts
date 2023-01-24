import {ArgumentMetadata, HttpStatus, ParseArrayOptions, ParseArrayPipe, PipeTransform} from '@nestjs/common'
import {HttpErrorByCode} from '@nestjs/common/utils/http-error-by-code.util'

export class ParseOneOrManyPipe implements PipeTransform {
    protected exceptionFactory: (error: string) => any

    constructor(protected readonly options: ParseArrayOptions) {
        this.options = options

        const {exceptionFactory, errorHttpStatusCode = HttpStatus.BAD_REQUEST} =
            options
        this.exceptionFactory =
            exceptionFactory ||
            (error => new HttpErrorByCode[errorHttpStatusCode](error))
    }

    async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
        const arrayPipe = new ParseArrayPipe(this.options)
        if (!Array.isArray(value))
            value = [value]
        return arrayPipe.transform(value, metadata)
    }
}