import {registerDecorator, ValidationArguments, ValidationOptions} from 'class-validator'

export function IsValidPassword (validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string) {
        registerDecorator({
            name: 'isValidPassword',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions || {message: 'password too weak'},
            validator: {
                validate(value: any, args?: ValidationArguments): Promise<boolean> | boolean {
                    const type = typeof value
                    if (type != 'string')
                        return false
                    if (value.length < 6 || value.length > 40)
                        return false
                    if (!value.match(/^[\x20-\x7e]+$/))
                        return false
                    if (!value.match(/[a-z]/))
                        return false
                    if (!value.match(/[A-Z]/))
                        return false
                    if (!value.match(/[0-9]/))
                        return false
                    if (!value.match(/[^0-9a-zA-Z]/))
                        return false
                    return true
                },
            },
        })
    }
}
