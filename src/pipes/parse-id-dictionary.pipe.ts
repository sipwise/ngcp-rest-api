import {
    ArgumentMetadata,
    BadRequestException,
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
import {PatchDto} from '../dto/patch.dto'
import {validate} from '../helpers/patch.helper'

interface ParseIdDictionaryOptions extends Omit<
    ValidationPipeOptions,
    'transform' | 'validateCustomDecorators' | 'exceptionFactory'
> {
    items: Type<unknown>
    valueIsArray?: boolean
    exceptionFactory?: (error: any) => any
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

        let errors = []
        const dict = new Dictionary<unknown>()

        for (const val in value) {
            if (!await parseId.transform(val, metadata))
                throw this.exceptionFactory(`Validation failed (parsable key of type int expected; got: '${typeof val}'`)

            const id = parseInt(val)

            if (this.options.valueIsArray) {
                const [instances, err] = await this.transformArray(id, value[id])
                if (err.length > 0)
                    errors = errors.concat(err)
                dict[id] = instances
                continue
            }

            try {
                dict[id] = await this.toClassInstance(value[val])
            } catch (err) {
                errors = errors.concat(await this.generateErrorMessage(err, id))
            }
        }

        if (errors.length > 0) {
            throw this.exceptionFactory(errors as any)
        }
        return dict
    }

    private async transformArray<T>(id: number, items: any): Promise<[T[], string[]]> {
        let errors: string[] = []

        if (!Array.isArray(items)) {
            errors = errors.concat('Validation failed (parsable array expected)')
            return [undefined, errors]
        }

        const instances = []

        for (const item of items) {
            try {
                instances.push(await this.toClassInstance((item)))
            } catch (err) {
                errors = errors.concat(await this.generateErrorMessage(err, id))
            }
        }
        return [instances, errors]
    }

    private async generateErrorMessage(err: any, id: number): Promise<string> {
        if ((err as any).getResponse) {
            const response = (err as any).getResponse()
            if (Array.isArray(response.message)) {
                return response.message.map(
                    (item: string) => `[${id}] ${item}`,
                )
            }
            return `[${id}] ${response.message}`
        }
        return err
    }

    private async toClassInstance(item: any, index?: number) {
        const validationMetadata: ArgumentMetadata = {
            metatype: this.options.items,
            type: 'body',
        }

        try {
            item = JSON.parse(item)
        } catch (err) {
            //throw new BadRequestException(err)
        }

        if (this.isExpectedTypePrimitive()) {
            return this.validatePrimitive(item, index)
        }
        if (this.isExpectedTypePatchOperation()) {
            const err = validate(item)
            if (err) {
                throw new BadRequestException(err.message.replace(/[\n\s]+/g, ' ').replace(/"/g, '\''))
            }
        }
        return this.validationPipe.transform(item, validationMetadata)
    }

    private isExpectedTypePatchOperation(): boolean {
        return this.options.items == PatchDto
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
