import {ValidationError, ValidatorOptions, validate as classValidatorValidate}  from 'class-validator'

export function validate(object: object, validatorOptions?: ValidatorOptions): Promise<ValidationError[]> {
    return classValidatorValidate(object, {
        forbidUnknownValues: false,
        ...validatorOptions,
    })
}