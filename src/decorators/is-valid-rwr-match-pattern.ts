import {applyDecorators} from '@nestjs/common'
import {ValidationArguments, registerDecorator} from 'class-validator'

export function IsValidRWRMatchPattern(): PropertyDecorator {
    const decorators: PropertyDecorator[] = [
    ]

    decorators.push(CanCompileRegex())
    decorators.push(HasMultiArrayVars())

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

function HasMultiArrayVars() {
    return function (object: unknown, propertyName: string): void {
        registerDecorator({
            name: 'endsWithDollarChar',
            target: object.constructor,
            propertyName: propertyName,
            options: {message: 'cannot have more than one array variable'},
            validator: {
                validate(value: unknown, args?: ValidationArguments): Promise<boolean> | boolean {
                    const matchPattern: string = args.object['match_pattern'] || ''
                    return (matchPattern.match(/@\{\w+\}/g) || []).length <= 1
                },
            },
        })
    }
}


