import {IsNotEmpty, IsString, registerDecorator, ValidationArguments, ValidationOptions} from 'class-validator'
import {applyDecorators} from '@nestjs/common'
import {config} from '~/config/main.config'
import zxcvbn from 'zxcvbn-typescript'

export type PasswordOptions = {
    username?: string
    validationOptions?: ValidationOptions
}

export function IsValidPassword(opts: PasswordOptions): PropertyDecorator {
    const settings = config.security.password

    if (!settings.web_validate) {
        return applyDecorators()
    }

    const decorators: PropertyDecorator[] = [
        IsString(),
        IsNotEmpty(),
        ContainsASCII(opts.validationOptions),
        IsValidLength(settings.min_length, settings.max_length, opts.validationOptions),
    ]

    if (settings.musthave_lowercase > 0)
        decorators.push(ContainsLowerCase(settings.musthave_lowercase, opts.validationOptions))

    if (settings.musthave_uppercase > 0)
        decorators.push(ContainsUpperCase(settings.musthave_uppercase, opts.validationOptions))

    if (settings.musthave_digit > 0)
        decorators.push(ContainsDigit(settings.musthave_digit, opts.validationOptions))

    if (settings.musthave_specialchar > 0)
        decorators.push(ContainsSpecialCharacter(settings.musthave_specialchar, opts.validationOptions))

    if (opts.username)
        decorators.push(ContainsUsername(opts.username, opts.validationOptions))

    decorators.push(IsStrongEnough(opts.validationOptions))

    return applyDecorators(...decorators)
}

function ContainsUsername(usernameField: string, validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string): void {
        registerDecorator({
            name: 'containsUsername',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions || {message: 'password must not contain username'},
            validator: {
                validate(value: any, args?: ValidationArguments): Promise<boolean> | boolean {
                    const username = (args?.object as any)[usernameField]
                    if (isString(username) && username.trim() !== '') {
                        return isString(value) && !value.includes(username)
                    }
                    return true
                },
            },
        })
    }
}

function IsStrongEnough(validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string): void {
        registerDecorator({
            name: 'isStrongEnough',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions || {message: 'password is not strong enough'},
            validator: {
                validate(value: any, _args?: ValidationArguments): Promise<boolean> | boolean {
                    return isString(value) && zxcvbn(value).score >= 3
                },
            },
        })
    }
}

function IsValidLength(min: number, max: number, validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string): void {
        registerDecorator({
            name: 'isValidLength',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions || {message: `password length must be between ${min} and ${max}`},
            validator: {
                validate(value: any, _args?: ValidationArguments): Promise<boolean> | boolean {
                    return isString(value) && value.length >= min && value.length <= max
                },
            },
        })
    }
}

function ContainsASCII(validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string): void {
        registerDecorator({
            name: 'containsASCII',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions || {message: 'must contain ascii'},
            validator: {
                validate(value: any, _args?: ValidationArguments): Promise<boolean> | boolean {
                    return isString(value) && value.match(/^[\x20-\x7e]+$/)
                },
            },
        })
    }
}

function ContainsLowerCase(n:number, validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string): void {
        registerDecorator({
            name: 'containsLowerCase',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions || {message: `must contain at least ${n} lowercase characters`},
            validator: {
                validate(value: any, _args?: ValidationArguments): Promise<boolean> | boolean {
                    const regex = new RegExp(`(?:.*[a-z]){${n}}`)
                    return isString(value) && regex.test(value)
                },
            },
        })
    }
}

function ContainsUpperCase(n:number, validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string): void {
        registerDecorator({
            name: 'containsUpperCase',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions || {message: `must contain at least ${n} uppercase characters`},
            validator: {
                validate(value: any, _args?: ValidationArguments): Promise<boolean> | boolean {
                    const regex = new RegExp(`(?:.*[A-Z]){${n}}`)
                    return isString(value) && regex.test(value)
                },
            },
        })
    }
}

function ContainsSpecialCharacter(n:number, validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string): void {
        registerDecorator({
            name: 'containsSpecialCharacter',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions || {message: `must contain at least ${n} special characters`},
            validator: {
                validate(value: any, _args?: ValidationArguments): Promise<boolean> | boolean {
                    const regex = new RegExp(`(?:.*[^0-9a-zA-Z]){${n}}`)
                    return isString(value) && regex.test(value)
                },
            },
        })
    }
}

function ContainsDigit(n:number, validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string): void {
        registerDecorator({
            name: 'containsNumber',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions || {message: `must contain at least ${n} digits`},
            validator: {
                validate(value: any, _args?: ValidationArguments): Promise<boolean> | boolean {
                    return isString(value) && value.match(/.*[0-9].*[0-9].*[0-9].*/)
                },
            },
        })
    }
}

function isString(value: any): boolean {
    return typeof value === 'string' || value instanceof String
}