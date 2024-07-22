import {ValidationArguments, registerDecorator} from 'class-validator'

export function DependsOn(otherProperty: string) {
    return function (object: unknown, propertyName: string) {
        registerDecorator({
            name: 'DependsOn',
            target: object.constructor,
            propertyName,
            validator: {
                defaultMessage() {
                    return `${otherProperty} is required if ${propertyName} is defined`
                },
                validate(_value: unknown, args?: ValidationArguments) {
                    const thisObject = args.object
                    if (![undefined].includes(thisObject[otherProperty])) {
                        return true
                    }
                    return false
                },
            },
        })
    }
}