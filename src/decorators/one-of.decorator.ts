import {ValidationArguments, registerDecorator} from 'class-validator'

export function OneOf(otherProperty: string) {
    return function (object: unknown, propertyName: string): void {
        registerDecorator({
            name: 'OneOf',
            target: object.constructor,
            propertyName,
            validator: {
                defaultMessage() {
                    return `Only one of ${propertyName} or ${otherProperty} is required`
                },
                validate(_value: unknown, args?: ValidationArguments) {
                    const thisObject = args.object
                    if (thisObject[propertyName] && thisObject[otherProperty]) {
                        return false
                    }
                    return true
                },
            },
        })
    }
}