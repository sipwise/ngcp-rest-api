import {ValidationArguments, registerDecorator} from 'class-validator'

export function Requires(otherProperty: string) {
    return function (object: unknown, propertyName: string) {
        registerDecorator({
            name: 'Requires',
            target: object.constructor,
            propertyName,
            validator: {
                defaultMessage() {
                    return `${otherProperty} is required if ${propertyName} is used`
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