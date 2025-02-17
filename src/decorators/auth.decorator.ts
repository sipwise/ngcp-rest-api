import {UseGuards,applyDecorators} from '@nestjs/common'
import {ApiBasicAuth, ApiBearerAuth, ApiSecurity} from '@nestjs/swagger'

import {Roles} from '~/decorators/roles.decorator'
import {BanGuard} from '~/guards/ban.guard'
import {OmniGuard} from '~/guards/omni.guard'
import {PasswordMaxAgeGuard} from '~/guards/password-max-age.guard'
import {ReadOnlyGuard} from '~/guards/read-only.guard'
import {RolesGuard} from '~/guards/roles.guard'

export function Auth(...roles: string[]): ClassDecorator & MethodDecorator {
    return applyDecorators(
        Roles(...roles),
        // OmniGuard binds user auth object to request, Guards requiring user object must always come after
        UseGuards(BanGuard, OmniGuard, PasswordMaxAgeGuard, RolesGuard, ReadOnlyGuard),
        ApiBasicAuth(),
        ApiBearerAuth(),
        ApiSecurity('cert'),
    )
}