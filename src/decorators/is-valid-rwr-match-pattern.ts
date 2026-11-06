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
            options: {message: '$property must be a valid regex pattern'},
            validator: {
                validate(_value: unknown, _args?: ValidationArguments): Promise<boolean> | boolean {
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
            name: 'hasMultiArrayVars',
            target: object.constructor,
            propertyName: propertyName,
            options: {message: '$property cannot have more than one array variable'},
            validator: {
                validate(_value: unknown, args?: ValidationArguments): Promise<boolean> | boolean {
                    const matchPattern: string = args.object['match_pattern'] || ''
                    return (matchPattern.match(/@\{\w+\}/g) || []).length <= 1
                },
            },
        })
    }
}


