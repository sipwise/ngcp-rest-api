import {HttpStatus} from '@nestjs/common'

import {AppService} from '~/app.service'
import {
    checkWriteItemsLimit,
    formatSize,
    readFileLimit,
    readRowsLimit,
    writeBodyLimit,
    writeFileLimit,
    writeItemsLimit,
} from '~/helpers/request-limits.helper'

describe('request-limits.helper', () => {
    const savedPerformance = AppService.config.performance

    afterEach(() => {
        AppService.config.performance = savedPerformance
    })

    it('uses the defaults without performance config', () => {
        AppService.config.performance = undefined
        expect(readRowsLimit()).toBe(10000)
        expect(writeItemsLimit()).toBe(10000)
        expect(writeBodyLimit()).toBe(20971520)
        expect(writeFileLimit()).toBe(52428800)
        expect(readFileLimit()).toBe(52428800)
    })

    it('converts configured sizes to bytes', () => {
        AppService.config.performance = {write_body_limit: '1.5kb', write_file_limit: '2MB', read_file_limit: '10b'}
        expect(writeBodyLimit()).toBe(1536)
        expect(writeFileLimit()).toBe(2097152)
        expect(readFileLimit()).toBe(10)
    })

    it('formats sizes in the largest unit that divides them evenly', () => {
        expect(formatSize(52428800)).toBe('50mb')
        expect(formatSize(1536)).toBe('1536b')
        expect(formatSize(1024)).toBe('1kb')
        expect(formatSize(10)).toBe('10b')
    })

    it('rejects more items than write_items_limit with 413 BULK_TOO_LARGE', () => {
        AppService.config.performance = {write_items_limit: 2}
        expect(() => checkWriteItemsLimit(2)).not.toThrow()
        expect(() => checkWriteItemsLimit(3)).toThrow(expect.objectContaining({
            status: HttpStatus.PAYLOAD_TOO_LARGE,
            response: {errorCode: 'BULK_TOO_LARGE', message: '3 items are more than the 2 allowed per request'},
        }))
    })
})
