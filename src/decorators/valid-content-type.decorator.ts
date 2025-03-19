import {SetMetadata, UseGuards, applyDecorators} from '@nestjs/common'
import {ApiConsumes} from '@nestjs/swagger'

import {ContentTypeGuard} from '~/guards/content-type.guard'

export function ValidContentTypes(...types: string[]): ClassDecorator & MethodDecorator {
    return applyDecorators(
        SetMetadata('validContentTypes', types),
        ApiConsumes(...types),
        UseGuards(ContentTypeGuard),
    )
}