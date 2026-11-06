import {Type, ValidationPipe, ValidationPipeOptions} from '@nestjs/common'
import {ValidationError, ValidatorOptions, validate as classValidatorValidate}  from 'class-validator'

import {ErrorEntry, formatValidationErrors} from '~/helpers/errors.helper'

export function validate(object: object, validatorOptions?: ValidatorOptions): Promise<ValidationError[]> {
    return classValidatorValidate(object, {
        forbidUnknownValues: false,
        ...validatorOptions,
    })
}

class ItemValidationErrors {
    constructor(readonly errors: ValidationError[]) {}
}

const objectExpected = 'Validation failed (object is expected)'

/**
 * ValidationPipe for single items of a bulk body; its errors are collected by validateItem
 */
export function createItemValidationPipe(options?: ValidationPipeOptions): ValidationPipe {
    return new ValidationPipe({
        transform: true,
        validateCustomDecorators: true,
        ...options,
        exceptionFactory: (errors: ValidationError[]) => new ItemValidationErrors(errors.map(err =>
            err.constraints?.isObject == objectExpected ? {...err, property: ''} : err,
        )),
    })
}

/**
 * Validates and transforms one item of a request body; the errors are added to `errors` with pointers below `pointer`
 * @returns the transformed item, undefined if it is invalid
 */
export async function validateItem<T>(pipe: ValidationPipe, item: unknown, metatype: Type<T>, pointer: string, errors: ErrorEntry[]): Promise<T> {
    try {
        return await pipe.transform(item, {type: 'body', metatype}) as T
    } catch (err) {
        if (!(err instanceof ItemValidationErrors))
            throw err
        errors.push(...formatValidationErrors(err.errors, pointer))
        return undefined
    }
}
