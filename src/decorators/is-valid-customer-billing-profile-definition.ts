import {
    ValidationArguments,
    ValidationOptions,
    registerDecorator,
} from 'class-validator'

import {CustomerRequestDto} from '~/api/customers/dto/customer-request.dto'
import {ContractBillingProfileDefinition} from '~/entities/internal/contract.internal.entity'

export function IsBillingProfileDefinitionValid(validationOptions?: ValidationOptions) {
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    return function (object: unknown, propertyName: string) {
        registerDecorator({
            name: 'isBillingProfileDefinitionValid',
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(_: unknown, args: ValidationArguments) {
                    const dto = args.object as CustomerRequestDto
                    const {billing_profile_definition} = dto
                    const hasId = dto.billing_profile_id !== undefined
                    const hasPackage = dto.profile_package_id !== undefined
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const hasProfiles = Array.isArray((dto as any).billing_profiles) && (dto as any).billing_profiles.length > 0

                    if (billing_profile_definition === ContractBillingProfileDefinition.ID) {
                        return hasId && !hasPackage && !hasProfiles
                    }

                    if (billing_profile_definition === ContractBillingProfileDefinition.Package) {
                        return !hasId && hasPackage && !hasProfiles
                    }

                    if (billing_profile_definition === ContractBillingProfileDefinition.Profiles) {
                        return !hasId && !hasPackage && hasProfiles
                    }

                    // If undefined, fallback to requiring ID
                    return hasId && !hasPackage && !hasProfiles
                },
            },
        })
    }
}