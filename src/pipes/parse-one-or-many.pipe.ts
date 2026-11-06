import {ArgumentMetadata, ParseArrayOptions, PipeTransform, Type, ValidationPipe} from '@nestjs/common'

import {ErrorEntry, ValidationFailedException} from '~/helpers/errors.helper'
import {createItemValidationPipe, validateItem} from '~/helpers/validate.helper'

/**
 * Validates an object or an array of objects (bulk POST) against `items`; every failing item is reported,
 * with pointers `/<index>/...` for arrays
 */
export class ParseOneOrManyPipe implements PipeTransform {
    protected readonly validationPipe: ValidationPipe

    constructor(protected readonly options: ParseArrayOptions) {
        const {items: _items, separator: _separator, optional: _optional, exceptionFactory: _factory, ...validationOptions} = options
        this.validationPipe = createItemValidationPipe({
            ...validationOptions,
            whitelist: true,
            forbidNonWhitelisted: true,
        })
    }

    async transform(value: unknown, _metadata: ArgumentMetadata): Promise<unknown[]> {
        const isArray = Array.isArray(value)
        const items: unknown[] = isArray ? value : [value]
        const errors: ErrorEntry[] = []
        const result: unknown[] = []
        for (const [index, item] of items.entries())
            result.push(await validateItem(this.validationPipe, item, this.options.items as Type<unknown>, isArray ? `/${index}` : '', errors))
        if (errors.length)
            throw new ValidationFailedException(errors)
        return result
    }
}
