import {IsString, registerDecorator, ValidationArguments, ValidationOptions} from 'class-validator'
import {applyDecorators} from '@nestjs/common'
import {config} from '../config/main.config'
import {PasswordSetting} from '../entities/internal/password-setting.internal.entity'

export function IsValidPassword(validationOptions?: ValidationOptions) {
    const settings = PasswordSetting.fromConfig(config)
    const decorators: PropertyDecorator[] = [
        IsString(),
        ContainsASCII(validationOptions),
        IsValidLength(validationOptions, settings.minLength, settings.maxLength),
    ]

    if (settings.lowercaseRequired) {
        decorators.push(ContainsLowerCase(validationOptions))
    }
    if (settings.uppercaseRequired) {
        decorators.push(ContainsUpperCase(validationOptions))
    }
    if (settings.digitRequired) {
        decorators.push(ContainsDigit(validationOptions))
    }
    if (settings.specialCharRequired) {
        decorators.push(ContainsSpecialCharacter(validationOptions))
    }

    return applyDecorators(...decorators)
}

function IsValidLength(validationOptions?: ValidationOptions, min?: number, max?: number) {
    min ??= 6
    max ??= 40
    return function (object: any, propertyName: string) {
        registerDecorator({
            name: 'isValidLength',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions || {message: `password length must be between ${min} and ${max}`},
            validator: {
                validate(value: any, args?: ValidationArguments): Promise<boolean> | boolean {
                    return isString(value) && value.length >= min && value.length <= max
                },
            },
        })
    }
}

function ContainsASCII(validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string) {
        registerDecorator({
            name: 'containsASCII',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions || {message: 'must contain ascii'},
            validator: {
                validate(value: any, args?: ValidationArguments): Promise<boolean> | boolean {
                    return isString(value) && value.match(/^[\x20-\x7e]+$/)
                },
            },
        })
    }
}

function ContainsLowerCase(validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string) {
        registerDecorator({
            name: 'containsLowerCase',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions || {message: 'must contain lower case'},
            validator: {
                validate(value: any, args?: ValidationArguments): Promise<boolean> | boolean {
                    return isString(value) && value.match(/[a-z]/)
                },
            },
        })
    }
}

function ContainsUpperCase(validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string) {
        registerDecorator({
            name: 'containsUpperCase',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions || {message: 'must contain upper case'},
            validator: {
                validate(value: any, args?: ValidationArguments): Promise<boolean> | boolean {
                    return isString(value) && value.match(/[A-Z]/)
                },
            },
        })
    }
}

function ContainsSpecialCharacter(validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string) {
        registerDecorator({
            name: 'containsSpecialCharacter',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions || {message: 'must contain a special character'},
            validator: {
                validate(value: any, args?: ValidationArguments): Promise<boolean> | boolean {
                    return isString(value) && value.match(/[^0-9a-zA-Z]/)
                },
            },
        })
    }
}

function ContainsDigit(validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string) {
        registerDecorator({
            name: 'containsNumber',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions || {message: 'must contain a number'},
            validator: {
                validate(value: any, args?: ValidationArguments): Promise<boolean> | boolean {
                    return isString(value) && value.match(/[0-9]/)
                },
            },
        })
    }
}

function isString(value: any): boolean {
    return typeof value === 'string' || value instanceof String
}
