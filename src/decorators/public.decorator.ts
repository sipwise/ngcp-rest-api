import {SetMetadata} from '@nestjs/common'

export const Public = (enabled: boolean = true) =>
    SetMetadata('isPublic', enabled)
