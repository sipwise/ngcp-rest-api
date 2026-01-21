import {applyDecorators} from '@nestjs/common'
import {
    ValidationArguments,
    isString,
    registerDecorator,
} from 'class-validator'

import {AppService} from '~/app.service'

export function IsValidViaRouteString(): PropertyDecorator {
    const decorators: PropertyDecorator[] = [
    ]

    decorators.push(NoDefinedViaRoutes())
    decorators.push(ValidViaRoutePatterns())
    decorators.push(ValidViaRouteValue())

    return applyDecorators(...decorators)
}

export function NoDefinedViaRoutes() {
    return function (object: object, propertyName: string):void {
        registerDecorator({
            name: 'NoDefinedViaRoutes',
            target: object.constructor,
            propertyName: propertyName,
            options: {message: 'no available values for the property'},
            validator: {
                validate(_value: unknown, _args: ValidationArguments) {
                    if (!AppService.config.sip.external_sbc.length) return false
                },
            },
        })
    }
}

export function ValidViaRoutePatterns() {
    return function (object: object, propertyName: string):void {
        registerDecorator({
            name: 'ValidViaRoutePatterns',
            target: object.constructor,
            propertyName: propertyName,
            options: {message: 'must be a valid SIP-URI as one of: sip:ip:port | <sip:ip:port> | <sip:ip:port;lr>'},
            validator: {
                validate(value: unknown, _args: ValidationArguments) {
                    if (!isString(value)) return false
                    if (value.match(/^<sip:[\d+.]+:\d+>$/)) return true
                    if (value.match(/^<sip:[\d+.]+:\d+;lr>$/)) return true
                },
            },
        })
    }
}



export function ValidViaRouteValue() {
    return function (object: object, propertyName: string):void {
        registerDecorator({
            name: 'ValidViaRouteValue',
            target: object.constructor,
            propertyName: propertyName,
            options: {message: `must be one of: ${AppService.config.sip.external_sbc})`},
            validator: {
                validate(value: unknown, _args: ValidationArguments) {
                    if (!isString(value)) return false
                    const res = value.match(/(sip:[\d+.]+:\d+)/)
                    if (!res) return false
                    if (AppService.config.sip.external_sbc.includes(res[1])) return true
                },
            },
        })
    }
}
