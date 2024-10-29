import {SetMetadata, UseGuards,applyDecorators} from '@nestjs/common'

import {LicenseGuard} from '~/guards/license.guard'

export const License = (...licenses: (string | false)[]): ClassDecorator & MethodDecorator => {
    return applyDecorators(
        SetMetadata('licenses', licenses.includes(false) ? [] : licenses),
        UseGuards(LicenseGuard),
    )
}