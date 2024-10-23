import {CustomDecorator, SetMetadata} from '@nestjs/common'

export const Public = (enabled = true): CustomDecorator =>
    SetMetadata('isPublic', enabled)
