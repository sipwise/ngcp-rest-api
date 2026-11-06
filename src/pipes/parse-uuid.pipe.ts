import {
    ArgumentMetadata,
    Injectable,
    Optional,
    ParseUUIDPipeOptions,
    PipeTransform,
    UUIDVersion,
} from '@nestjs/common'
import {isUUID} from 'class-validator'

import {parameterException} from '~/helpers/errors.helper'

interface ParseUUIDIdPipeOptions extends Pick<ParseUUIDPipeOptions, 'version'> {
    allowUndefined?: boolean
}

export function isUuidValue(value: unknown, version?: UUIDVersion): boolean {
    return typeof value == 'string' && isUUID(value, version as never)
}

@Injectable()
export class ParseUUIDPipe implements PipeTransform {
    constructor(
        @Optional() protected readonly options?: ParseUUIDIdPipeOptions,
    ) {
        this.options = options || {}
    }

    async transform(value: unknown, metadata: ArgumentMetadata): Promise<string> {
        if (value == undefined && this.options.allowUndefined) {
            return undefined
        }
        const name = metadata.data ?? 'id'
        if (!isUuidValue(value, this.options.version))
            throw parameterException(name, 'isUuid', `${name} must be a UUID`)
        return value as string
    }
}
