import {ArgumentMetadata, HttpStatus, Injectable, Optional, PipeTransform} from '@nestjs/common'
import {ErrorHttpStatusCode, HttpErrorByCode} from '@nestjs/common/utils/http-error-by-code.util'
import {isUUID} from '@nestjs/common/utils/is-uuid'

export interface ParseIdPipeOptions {
    errorHttpStatusCode?: ErrorHttpStatusCode;
    exceptionFactory?: (errors: string) => any;
}

@Injectable()
export class ParseIdPipe implements PipeTransform {
    protected readonly uuidVersion: '3' | '4' | '5'
    protected exceptionFactory: (errors: string) => any

    constructor(@Optional() options?: ParseIdPipeOptions) {
        options = options || {}
        const {
            exceptionFactory,
            errorHttpStatusCode = HttpStatus.BAD_REQUEST,
        } = options

        this.exceptionFactory =
            exceptionFactory ||
            (error => new HttpErrorByCode[errorHttpStatusCode](error))
    }

    async transform(value: any, metadata: ArgumentMetadata): Promise<string | number> {
        if (isUUID(value, this.uuidVersion))
            return value

        if (['string', 'number'].includes(typeof value) &&
            /^-?\d+$/.test(value) &&
            isFinite(value as any))
            return parseInt(value, 10)

        throw this.exceptionFactory(
            'Validation failed (unsupported :id format)',
        )
    }
}