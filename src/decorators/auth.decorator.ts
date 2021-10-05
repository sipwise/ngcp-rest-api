import {applyDecorators, UseGuards} from '@nestjs/common'
import {ApiBasicAuth, ApiBearerAuth, ApiSecurity} from '@nestjs/swagger'
import {OmniGuard} from '../guards/omni.guard'
import {ReadOnlyGuard} from '../guards/read-only.guard'
import {RolesGuard} from '../guards/roles.guard'
import {Roles} from './roles.decorator'

export function Auth(...roles: string[]) {
    //console.log(`Roles in ${Auth.name}`, roles)
    return applyDecorators(
        Roles(...roles),
        // OmniGuard binds user auth object to request, Guards requiring user object must always come after
        UseGuards(OmniGuard, RolesGuard, ReadOnlyGuard),
        ApiBasicAuth(),
        ApiBearerAuth(),
        ApiSecurity('cert'),
    )
}
