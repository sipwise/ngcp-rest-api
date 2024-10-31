import {applyDecorators} from '@nestjs/common'
import {IsNotEmpty, IsString, ValidationArguments, ValidationOptions, registerDecorator} from 'class-validator'
import zxcvbn from 'zxcvbn-typescript'

import {config} from '~/config/main.config'


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
    return function (object: unknown, propertyName: string): void {
        registerDecorator({
            name: 'containsUsername',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions || {message: 'password must not contain username'},
            validator: {
                validate(value: unknown, args?: ValidationArguments): Promise<boolean> | boolean {
                    const username = (args?.object as unknown)[usernameField]
                    if (isString(username) && username.trim() !== '') {
                        return isString(value) && !(value as string).includes(username)
                    }
                    return true
                },
            },
        })
    }
}

function IsStrongEnough(validationOptions?: ValidationOptions) {
    return function (object: unknown, propertyName: string): void {
        registerDecorator({
            name: 'isStrongEnough',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions || {message: 'password is not strong enough'},
            validator: {
                validate(value: unknown, _args?: ValidationArguments): Promise<boolean> | boolean {
                    if (!isString(value))
                        return false
                    const str = value as string
                    return zxcvbn(str).score >= 3
                },
            },
        })
    }
}

function IsValidLength(min: number, max: number, validationOptions?: ValidationOptions) {
    return function (object: unknown, propertyName: string): void {
        registerDecorator({
            name: 'isValidLength',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions || {message: `password length must be between ${min} and ${max}`},
            validator: {
                validate(value: unknown, _args?: ValidationArguments): Promise<boolean> | boolean {
                    if (!isString(value))
                        return false
                    const str = value as string
                    return str.length >= min && str.length <= max
                },
            },
        })
    }
}

function ContainsASCII(validationOptions?: ValidationOptions) {
    return function (object: unknown, propertyName: string): void {
        registerDecorator({
            name: 'containsASCII',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions || {message: 'must contain ascii'},
            validator: {
                validate(value: unknown, _args?: ValidationArguments): Promise<boolean> | boolean {
                    if (!isString(value))
                        return false
                    const str = value as string
                    const regexp = new RegExp(/^[\x20-\x7e]+$/)
                    return regexp.test(str)
                },
            },
        })
    }
}

function ContainsLowerCase(n:number, validationOptions?: ValidationOptions) {
    return function (object: unknown, propertyName: string): void {
        registerDecorator({
            name: 'containsLowerCase',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions || {message: `must contain at least ${n} lowercase characters`},
            validator: {
                validate(value: unknown, _args?: ValidationArguments): Promise<boolean> | boolean {
                    const regex = new RegExp(`(?:.*[a-z]){${n}}`)
                    if (!isString(value))
                        return false
                    const str = value as string
                    return regex.test(str)
                },
            },
        })
    }
}

function ContainsUpperCase(n:number, validationOptions?: ValidationOptions) {
    return function (object: unknown, propertyName: string): void {
        registerDecorator({
            name: 'containsUpperCase',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions || {message: `must contain at least ${n} uppercase characters`},
            validator: {
                validate(value: unknown, _args?: ValidationArguments): Promise<boolean> | boolean {
                    const regex = new RegExp(`(?:.*[A-Z]){${n}}`)
                    if (!isString(value))
                        return false
                    const str = value as string
                    return regex.test(str)
                },
            },
        })
    }
}

function ContainsSpecialCharacter(n:number, validationOptions?: ValidationOptions) {
    return function (object: unknown, propertyName: string): void {
        registerDecorator({
            name: 'containsSpecialCharacter',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions || {message: `must contain at least ${n} special characters`},
            validator: {
                validate(value: unknown, _args?: ValidationArguments): Promise<boolean> | boolean {
                    const regex = new RegExp(`(?:.*[^0-9a-zA-Z]){${n}}`)
                    if (!isString(value))
                        return false
                    const str = value as string
                    return regex.test(str)
                },
            },
        })
    }
}

function ContainsDigit(n:number, validationOptions?: ValidationOptions) {
    return function (object: unknown, propertyName: string): void {
        registerDecorator({
            name: 'containsNumber',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions || {message: `must contain at least ${n} digits`},
            validator: {
                validate(value: unknown, _args?: ValidationArguments): Promise<boolean> | boolean {
                    const regex = new RegExp(`(?:.*[0-9]){${n}}`)
                    if (!isString(value))
                        return false
                    const str = value as string
                    return regex.test(str)
                },
            },
        })
    }
}

function isString(value: unknown): boolean {
    return typeof value === 'string' || value instanceof String
}