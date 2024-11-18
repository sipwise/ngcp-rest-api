import {ValidateIf,ValidationOptions} from 'class-validator'

/**
 * Disables validation if the value is null.
 * It allows furhter validation to be executed if the value is not null.
 * It does not allow undefined values.
 *
 * @param validationOptions {@link ValidationOptions}
 */

export function CanBeNull(validationOptions?: ValidationOptions): PropertyDecorator {
    return ValidateIf((_object, value) => value !== null, validationOptions)
}