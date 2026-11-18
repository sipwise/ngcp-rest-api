import {PayloadTooLargeException} from '@nestjs/common'

import {AppService} from '~/app.service'
import {SIZE_PATTERN} from '~/config/schemas/performance.config.schema'
import {errorMessage} from '~/helpers/errors.helper'

const READ_LIMIT = 10000
const WRITE_LIMIT = 10000
const BODY_LIMIT = '20mb'
const SIZE_UNITS = {
    b: 1,
    kb: 1024,
    mb: 1024 ** 2,
    gb: 1024 ** 3,
}

export function readLimit(): number {
    return AppService.config.performance?.read_limit ?? READ_LIMIT
}

export function writeLimit(): number {
    return AppService.config.performance?.write_limit ?? WRITE_LIMIT
}

// in bytes, for the JSON body parsers and the CSV uploads
export function bodyLimit(): number {
    const [, value, unit] = SIZE_PATTERN.exec(AppService.config.performance?.body_limit ?? BODY_LIMIT)
    return Math.floor(+value * SIZE_UNITS[unit.toLowerCase()])
}

/**
 * 413 for a bulk request with more items than write_limit, checked before the items are validated
 */
export function checkWriteLimit(count: number): void {
    const max = writeLimit()
    if (count > max)
        throw new PayloadTooLargeException(errorMessage('BULK_TOO_LARGE', {count, max}))
}
