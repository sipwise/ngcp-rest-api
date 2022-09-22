import {ArgumentMetadata, HttpStatus, Injectable, Optional, PipeTransform} from '@nestjs/common'
import {ErrorHttpStatusCode, HttpErrorByCode} from '@nestjs/common/utils/http-error-by-code.util'
import {ParseUUIDPipe} from '@nestjs/common/pipes/parse-uuid.pipe'
import {Messages} from '../config/messages.config'

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
        let parseUUID = new ParseUUIDPipe({ exceptionFactory: this.exceptionFactory })
        if (!await parseUUID.transform(value, {} as ArgumentMetadata))
            return value

        if (['string', 'number'].includes(typeof value) &&
            /^-?\d+$/.test(value) &&
            isFinite(value as any))
            return parseInt(value, 10)

        throw this.exceptionFactory(
            Messages.invoke(Messages.VALIDATION_FAILED_UNSUPPORTED_ID).description,
        )
    }
}
