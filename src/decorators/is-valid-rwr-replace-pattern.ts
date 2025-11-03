import {applyDecorators} from '@nestjs/common'
import {ValidationArguments, registerDecorator} from 'class-validator'

export function IsValidRWRReplacePattern(): PropertyDecorator {
    const decorators: PropertyDecorator[] = [
    ]

    decorators.push(CanCompileRegex())
    decorators.push(EndsWithDollarChar())
    decorators.push(StartsWithQuestionChar())
    decorators.push(ContainsSpaces())
    decorators.push(HasArrayVars())

    return applyDecorators(...decorators)
}

function CanCompileRegex() {
    return function (object: unknown, propertyName: string): void {
        registerDecorator({
            name: 'canCompileRegex',
            target: object.constructor,
            propertyName: propertyName,
            options: {message: 'invalid regex pattern'},
            validator: {
                validate(value: unknown, args?: ValidationArguments): Promise<boolean> | boolean {
                    // TODO: implement it
                    return true
                },
            },
        })
    }
}

function EndsWithDollarChar() {
    return function (object: unknown, propertyName: string): void {
        registerDecorator({
            name: 'endsWithDollarChar',
            target: object.constructor,
            propertyName: propertyName,
            options: {message: 'cannot end with \'$\''},
            validator: {
                validate(value: unknown, args?: ValidationArguments): Promise<boolean> | boolean {
                    const replacePattern: string = args.object['replace_pattern'] || ''
                    return ! new RegExp(/\$$/).test(replacePattern)
                },
            },
        })
    }
}

function StartsWithQuestionChar() {
    return function (object: unknown, propertyName: string): void {
        registerDecorator({
            name: 'endsWithDollarChar',
            target: object.constructor,
            propertyName: propertyName,
            options: {message: 'cannot start with \'?\''},
            validator: {
                validate(value: unknown, args?: ValidationArguments): Promise<boolean> | boolean {
                    const replacePattern: string = args.object['replace_pattern'] || ''
                    return ! new RegExp(/^[?]/).test(replacePattern)
                },
            },
        })
    }
}

function ContainsSpaces() {
    return function (object: unknown, propertyName: string): void {
        registerDecorator({
            name: 'endsWithDollarChar',
            target: object.constructor,
            propertyName: propertyName,
            options: {message: 'cannot contain spaces'},
            validator: {
                validate(value: unknown, args?: ValidationArguments): Promise<boolean> | boolean {
                    const replacePattern: string = args.object['replace_pattern'] || ''
                    return ! new RegExp(/\s/).test(replacePattern)
                },
            },
        })
    }
}

function HasArrayVars() {
    return function (object: unknown, propertyName: string): void {
        registerDecorator({
            name: 'endsWithDollarChar',
            target: object.constructor,
            propertyName: propertyName,
            options: {message: 'cannot have array variable'},
            validator: {
                validate(value: unknown, args?: ValidationArguments): Promise<boolean> | boolean {
                    const replacePattern: string = args.object['replace_pattern'] || ''
                    return (replacePattern.match(/@\{\w+\}/g) || []).length == 0
                },
            },
        })
    }
}


