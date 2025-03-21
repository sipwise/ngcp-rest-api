// TODO: Check if full type safety is possible in pipes
/* eslint-disable @typescript-eslint/no-explicit-any */

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
            // TODO: Fix the return type
            // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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
