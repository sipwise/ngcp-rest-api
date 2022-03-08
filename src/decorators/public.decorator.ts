import {SetMetadata} from '@nestjs/common'

export const Public = (enabled = true) =>
    SetMetadata('isPublic', enabled)
