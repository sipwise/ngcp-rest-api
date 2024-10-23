import {ValidationError} from 'class-validator'

const redactedKeys = ['password', 'webpassword']

export function obfuscatePasswordJSON(key: any, value: any): any {
    if (redactedKeys.includes(key)) {
        return '********'
    }
    return value
}

/**
 * Masks `redactedKeys` in target and value of each error
 * @param errors array of ValidationError
 */
export function obfuscatePasswordValidationErrors(errors: ValidationError[]): void {
    for (const errorsKey in errors) {
        const property = errors[errorsKey].property
        if (redactedKeys.includes(property)) {
            errors[errorsKey].target[property] = '*******'
            errors[errorsKey].value = '*******'
        }
    }
}