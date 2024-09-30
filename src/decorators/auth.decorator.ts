import {applyDecorators, UseGuards} from '@nestjs/common'
import {ApiBasicAuth, ApiBearerAuth, ApiSecurity} from '@nestjs/swagger'
import {OmniGuard} from '../guards/omni.guard'
import {ReadOnlyGuard} from '../guards/read-only.guard'
import {RolesGuard} from '../guards/roles.guard'
import {Roles} from './roles.decorator'
import {BanGuard} from '../guards/ban.guard'
import {PasswordMaxAgeGuard} from '../guards/password-max-age.guard'

export function Auth(...roles: string[]) {
    return applyDecorators(
        Roles(...roles),
        // OmniGuard binds user auth object to request, Guards requiring user object must always come after
        UseGuards(BanGuard, OmniGuard, PasswordMaxAgeGuard, RolesGuard, ReadOnlyGuard),
        ApiBasicAuth(),
        ApiBearerAuth(),
        ApiSecurity('cert'),
    )
}