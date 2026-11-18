import {
    ArgumentMetadata,
    Injectable,
    PipeTransform,
    Type,
    ValidationPipe,
    ValidationPipeOptions,
} from '@nestjs/common'

import {PatchDto} from '~/dto/patch.dto'
import {Dictionary} from '~/helpers/dictionary.helper'
import {
    ErrorEntry,
    ErrorListException,
    ValidationFailedException,
    escapePointerToken,
    isErrorListException,
    mergeErrorListExceptions,
} from '~/helpers/errors.helper'
import {Operation, assertJsonPatch, normalisePatch} from '~/helpers/patch.helper'
import {checkWriteLimit} from '~/helpers/request-limits.helper'
import {createItemValidationPipe, validateItem} from '~/helpers/validate.helper'
import {forEachYield, mapYield} from '~/helpers/yield.helper'
import {isIntId} from '~/pipes/parse-int-id.pipe'

interface ParseIdDictionaryOptions extends Omit<
    ValidationPipeOptions,
    'transform' | 'validateCustomDecorators' | 'exceptionFactory'
> {
    items: Type<unknown>
    valueIsArray?: boolean
}

/**
 * Validates a body of items keyed by id (bulk PUT/PATCH); every failing item is reported, with pointers
 * `/<id>/...` (`/<id>/<index>/...` for arrays of items)
 */
@Injectable()
export class ParseIdDictionary implements PipeTransform {
    protected readonly validationPipe: ValidationPipe
    protected readonly options: ParseIdDictionaryOptions

    constructor(
        options: ParseIdDictionaryOptions,
    ) {
        this.options = options
        const {items: _items, valueIsArray: _valueIsArray, ...validationOptions} = options
        this.validationPipe = createItemValidationPipe(validationOptions)
    }

    async transform(value: unknown, _metadata: ArgumentMetadata): Promise<Dictionary<unknown>> {
        if (value == null || typeof value != 'object' || Array.isArray(value))
            throw new ValidationFailedException([{pointer: '', code: 'isObject', message: 'body must be an object of items keyed by id'}])
        const entries = Object.entries(value)
        checkWriteLimit(entries.length)

        const errors: ErrorEntry[] = []
        const patchErrors: ErrorListException[] = []
        const dict = new Dictionary<unknown>()

        await forEachYield(entries, async ([key, item]) => {
            const pointer = `/${escapePointerToken(key)}`
            if (!isIntId(key)) {
                errors.push({pointer, code: 'isInt', message: 'key must be an integer id'})
                return
            }
            if (this.options.items == PatchDto) {
                try {
                    assertJsonPatch(item, pointer)
                    dict[key] = normalisePatch(item as Operation[])
                } catch (err) {
                    if (!isErrorListException(err))
                        throw err
                    patchErrors.push(err)
                }
                return
            }
            if (this.options.valueIsArray) {
                if (!Array.isArray(item)) {
                    errors.push({pointer, code: 'isArray', message: 'value must be an array'})
                    return
                }
                dict[key] = await mapYield(item, (element, index) => this.toInstance(element, `${pointer}/${index}`, errors))
                return
            }
            dict[key] = await this.toInstance(item, pointer, errors)
        })

        if (errors.length)
            patchErrors.push(new ValidationFailedException(errors))
        if (patchErrors.length)
            throw mergeErrorListExceptions(patchErrors)
        return dict
    }

    private async toInstance(item: unknown, pointer: string, errors: ErrorEntry[]): Promise<unknown> {
        if (typeof item == 'string') {
            try {
                item = JSON.parse(item)
            } catch {
                // not json, validated as is
            }
        }
        if (this.isExpectedTypePrimitive())
            return this.validatePrimitive(item, pointer, errors)
        return validateItem(this.validationPipe, item, this.options.items, pointer, errors)
    }

    protected isExpectedTypePrimitive(): boolean {
        return [Boolean, Number, String].includes(this.options.items as never)
    }

    protected validatePrimitive(value: unknown, pointer: string, errors: ErrorEntry[]): unknown {
        if (this.options.items === Number) {
            const number = value !== null && value !== '' ? +value : NaN
            if (isNaN(number))
                errors.push({pointer, code: 'isNumber', message: 'item must be a number'})
            return number
        }
        if (this.options.items === String)
            return typeof value == 'string' ? value : `${value}`
        if (this.options.items === Boolean && typeof value !== 'boolean')
            errors.push({pointer, code: 'isBoolean', message: 'item must be a boolean value'})
        return value
    }
}
