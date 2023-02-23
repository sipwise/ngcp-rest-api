import {
    ArgumentMetadata,
    HttpStatus,
    Injectable,
    ParseIntPipe,
    PipeTransform,
    Type,
    ValidationPipe,
    ValidationPipeOptions,
} from '@nestjs/common'
import {HttpErrorByCode} from '@nestjs/common/utils/http-error-by-code.util'
import {isString, isUndefined} from '@nestjs/common/utils/shared.utils'
import {Dictionary} from '../helpers/dictionary.helper'

interface ParseIdDictionaryOptions extends Omit<
    ValidationPipeOptions,
    'transform' | 'validateCustomDecorators' | 'exceptionFactory'
> {
    items: Type<unknown>;
    exceptionFactory?: (error: any) => any;
}

@Injectable()
export class ParseIdDictionary implements PipeTransform {
    protected readonly validationPipe: ValidationPipe
    protected exceptionFactory: (errors: string) => any
    protected readonly options: ParseIdDictionaryOptions

    constructor(
        options: ParseIdDictionaryOptions,
    ) {
        this.options = options
        this.validationPipe = new ValidationPipe({
            transform: true,
            validateCustomDecorators: true,
            ...options,
        })
        const {
            exceptionFactory,
            errorHttpStatusCode = HttpStatus.BAD_REQUEST,
        } = options
        this.exceptionFactory =
            exceptionFactory ||
            (error => new HttpErrorByCode[errorHttpStatusCode](error))
    }

    async transform(value: any, metadata: ArgumentMetadata): Promise<Dictionary<unknown>> {
        const parseId = new ParseIntPipe(this.options)
        if (typeof value != 'object')
            throw this.exceptionFactory('Validation failed (parsable dictionary expected)')

        const validationMetadata: ArgumentMetadata = {
            metatype: this.options.items,
            type: 'body',
        }
        const isExpectedTypePrimitive = this.isExpectedTypePrimitive()
        const toClassInstance = (item: any, index?: number) => {
            try {
                item = JSON.parse(item)
            } catch {
            }

            if (isExpectedTypePrimitive) {
                return this.validatePrimitive(item, index)
            }
            return this.validationPipe.transform(item, validationMetadata)
        }

        let errors = []
        const dict = new Dictionary<unknown>()
        for (const val in value) {
            if (!await parseId.transform(val, metadata))
                throw this.exceptionFactory(`Validation failed (parsable key of type int expected; got: '${typeof val}'`)
            try {
                dict[parseInt(val)] = await toClassInstance(value[val])
            } catch (err) {
                let message: string[] | unknown
                if ((err as any).getResponse) {
                    const response = (err as any).getResponse()
                    if (Array.isArray(response.message)) {
                        message = response.message.map(
                            (item: string) => `[${val}] ${item}`,
                        )
                    } else {
                        message = `[${val}] ${response.message}`
                    }
                } else {
                    message = err
                }
                errors = errors.concat(message)
            }
        }
        if (errors.length > 0) {
            throw this.exceptionFactory(errors as any)
        }
        return dict
    }

    protected isExpectedTypePrimitive(): boolean {
        return [Boolean, Number, String].includes(this.options.items as any)
    }

    protected validatePrimitive(originalValue: any, index?: number) {
        if (this.options.items === Number) {
            const value =
                originalValue !== null && originalValue !== '' ? +originalValue : NaN
            if (isNaN(value)) {
                throw this.exceptionFactory(
                    `${isUndefined(index) ? '' : `[${index}] `}item must be a number`,
                )
            }
            return value
        } else if (this.options.items === String) {
            if (!isString(originalValue)) {
                return `${originalValue}`
            }
        } else if (this.options.items === Boolean) {
            if (typeof originalValue !== 'boolean') {
                throw this.exceptionFactory(
                    `${
                        isUndefined(index) ? '' : `[${index}] `
                    }item must be a boolean value`,
                )
            }
        }
        return originalValue
    }
}
