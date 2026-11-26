import {PayloadTooLargeException} from '@nestjs/common'

import {AppService} from '~/app.service'
import {SIZE_PATTERN} from '~/config/schemas/performance.config.schema'
import {errorMessage} from '~/helpers/errors.helper'

const READ_ROWS_LIMIT = 10000
const WRITE_ITEMS_LIMIT = 10000
const WRITE_BODY_LIMIT = '20mb'
const WRITE_FILE_LIMIT = '50mb'
const READ_FILE_LIMIT = '50mb'
const SIZE_UNITS = {
    b: 1,
    kb: 1024,
    mb: 1024 ** 2,
    gb: 1024 ** 3,
}

export function readRowsLimit(): number {
    return AppService.config.performance?.read_rows_limit ?? READ_ROWS_LIMIT
}

export function writeItemsLimit(): number {
    return AppService.config.performance?.write_items_limit ?? WRITE_ITEMS_LIMIT
}

// in bytes
export function writeBodyLimit(): number {
    return toBytes(AppService.config.performance?.write_body_limit ?? WRITE_BODY_LIMIT)
}

// in bytes
export function writeFileLimit(): number {
    return toBytes(AppService.config.performance?.write_file_limit ?? WRITE_FILE_LIMIT)
}

// in bytes
export function readFileLimit(): number {
    return toBytes(AppService.config.performance?.read_file_limit ?? READ_FILE_LIMIT)
}

// a byte count in the largest unit that divides it evenly, e.g. 50mb, 1536b
export function formatSize(bytes: number): string {
    const units = Object.entries(SIZE_UNITS).reverse()
    const [unit, size] = units.find(([, size]) => bytes % size == 0) ?? ['b', 1]
    return `${bytes / size}${unit}`
}

/**
 * 413 for a bulk request with more items than write_items_limit, checked before the items are validated
 */
export function checkWriteItemsLimit(count: number): void {
    const max = writeItemsLimit()
    if (count > max)
        throw new PayloadTooLargeException(errorMessage('BULK_TOO_LARGE', {count, max}))
}

function toBytes(size: string): number {
    const [, value, unit] = SIZE_PATTERN.exec(size)
    return Math.floor(+value * SIZE_UNITS[unit.toLowerCase()])
}
