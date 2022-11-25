import {ArgumentMetadata, HttpStatus, Injectable, Optional, PipeTransform} from '@nestjs/common'
import {ErrorHttpStatusCode, HttpErrorByCode} from '@nestjs/common/utils/http-error-by-code.util'
import {ParseUUIDPipe} from '@nestjs/common/pipes/parse-uuid.pipe'
import {I18nService} from 'nestjs-i18n'

export interface ParseIdPipeOptions {
    errorHttpStatusCode?: ErrorHttpStatusCode;
    exceptionFactory?: (errors: string) => any;
}

@Injectable()
export class ParseIdPipe implements PipeTransform {
    protected readonly uuidVersion: '3' | '4' | '5'
    protected exceptionFactory: (errors: string) => any

    constructor(
        private readonly i18n: I18nService,
        @Optional() options?: ParseIdPipeOptions,
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

    async transform(value: any, metadata: ArgumentMetadata): Promise<string | number> {
        const parseUUID = new ParseUUIDPipe({ exceptionFactory: this.exceptionFactory })
        if (!await parseUUID.transform(value, {} as ArgumentMetadata))
            return value

        if (['string', 'number'].includes(typeof value) &&
            /^-?\d+$/.test(value) &&
            isFinite(value as any))
            return parseInt(value, 10)

        throw this.exceptionFactory(this.i18n.t('errors.pipe.VALIDATION_FAILED_UNSUPPORTED_ID'))
    }
}
