import {SetMetadata, UseGuards, applyDecorators} from '@nestjs/common'
import {ApiConsumes} from '@nestjs/swagger'

import {ApiAcceptHeaderGuard} from '~/guards/api-accept-header.guard'

export function ApiAcceptHeader(...types: string[]): ClassDecorator & MethodDecorator {
    if (!types.includes('*/*'))
        types.push('*/*')
    return applyDecorators(
        SetMetadata('validAccepts', types),
        ApiConsumes(...types),
        UseGuards(ApiAcceptHeaderGuard),
    )
}