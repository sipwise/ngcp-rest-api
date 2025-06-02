import {
    ValidationArguments,
    ValidationOptions,
    isString,
    registerDecorator,
} from 'class-validator'

export function IsDateTimeStringOrZeroString(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string):void {
        registerDecorator({
            name: 'IsDateTimeStringOrZeroString',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: unknown, _args: ValidationArguments) {
                    if (!isString(value)) return false
                    if (value === '0.000') return true
                    const date = Date.parse(value)
                    return !isNaN(date)
                },
                defaultMessage(args: ValidationArguments) {
                    return `"${args.property}" must be a valid ISO 8601 date string or the string "0.000"`
                },
            },
        })
    }
}
