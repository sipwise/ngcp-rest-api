import {Transform} from 'class-transformer'
import {ValidateBy, ValidationArguments} from 'class-validator'

import {errorMessage} from '~/helpers/errors.helper'
import {canonicalTimezone} from '~/helpers/timezone.helper'

/**
 * IANA timezone name (stored in its canonical case); null is left to @IsOptional/@CanBeNull. Platform aliases
 * like 'localtime' or 'SYSTEM' are rejected.
 */
export function IsTimezoneName(): PropertyDecorator {
    return (target: object, propertyKey: string | symbol): void => {
        Transform(({value}: {value: unknown}) => typeof value == 'string' ? canonicalTimezone(value) ?? value : value, {toClassOnly: true})(target, propertyKey)
        ValidateBy({
            name: 'isTimezoneName',
            validator: {
                validate: (value: unknown): boolean => value == null || typeof value == 'string' && canonicalTimezone(value) === value,
                defaultMessage: (args: ValidationArguments): string =>
                    `${args.property} ${errorMessage('INVALID_TIMEZONE_NAME').message}`,
            },
        })(target, String(propertyKey))
    }
}
