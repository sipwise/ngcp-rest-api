import {Readable} from 'stream'

import {StreamableFile, UnprocessableEntityException} from '@nestjs/common'
import {plainToInstance} from 'class-transformer'
import {ValidationError} from 'class-validator'
import {Response} from 'express'
import * as Papa from 'papaparse'

import {ErrorEntry, ValidationFailedException, formatValidationErrors} from './errors.helper'
import {checkWriteLimit} from './request-limits.helper'
import {validate} from './validate.helper'
import {mapYield} from './yield.helper'

import {errorMessage} from '~/helpers/errors.helper'

export interface CsvOptions {
    numericBooleans?: boolean
}
/**
 * Converts UTF-8CSV file buffer to an array of the provided DTO type.
 *
 */
export async function csvToDto<T extends object>(file: Express.Multer.File, dtoClass: new () => T): Promise<T[] | null> {
    const result = await new Promise<Papa.ParseResult<object>>((resolve, reject) => {
        const stream = Readable.from(file.buffer.toString('utf-8'))
        stream.on('error', reject)
        Papa.parse(stream, {
            header: true,
            skipEmptyLines: true,
            delimiter: ',',
            encoding: 'utf-8',
            complete: resolve,
            error: reject,
        })
    })

    const rows = result.data
    if (!rows || rows.length === 0)
        return null
    checkWriteLimit(rows.length)

    let dtos: T[]
    let rowErrors: ValidationError[][]
    try {
        dtos = await mapYield(rows, row => plainToInstance(dtoClass, row))
        rowErrors = await mapYield(dtos, dto => validate(dto))
    } catch {
        throw new UnprocessableEntityException(errorMessage('CSV_MALFORMED'))
    }

    const errors: ErrorEntry[] = []
    rowErrors.forEach((validationErrors, row) => {
        errors.push(...formatValidationErrors(validationErrors, `/${row}`))
    })
    if (errors.length > 0)
        throw new ValidationFailedException(errors)
    return dtos
}

/**
 * Converts an array of the provided DTO type to a UTF-8 CSV string.
 *
 */
export async function dtoToCsv<T extends object>(dtos: T[], options?: CsvOptions): Promise<string> {
    const useNumericBooleans = options?.numericBooleans || false
    const mappedDtos = useNumericBooleans
        ? await mapYield(dtos, dto => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result: Record<string, any> = {}
            for (const [key, value] of Object.entries(dto)) {
                if (typeof value === 'boolean') {
                    result[key] = value ? '1' : '0'
                } else {
                    result[key] = value
                }
            }
            return result
        })
        : dtos
    const csv = Papa.unparse(mappedDtos, {
        delimiter: ',',
        header: true,
    })
    return csv
}

/**
 * Handles the CSV export of the provided streamable file.
 * Sets the response headers and returns the streamable file
 *
 */
export function handleCsvExport(stream: StreamableFile, res: Response): StreamableFile {
    const disposition = typeof stream.options.disposition === 'string'
        ? stream.options.disposition
        : stream.options.disposition?.[0]

    const size = extractContentSize(disposition)
    res.set({
        ...(size > 0 && {'Content-Length': size}),
        'Content-Type': stream.options.type,
        'Content-Disposition': stream.options.disposition,
    })
    res['passthrough'] = true
    return stream
}

/**
 * Extracts the content size from the disposition header
 *
 */
export function extractContentSize(disposition: string): number {
    let size = 0
    disposition.split(/;\s*/).forEach(pair => {
        const p = pair.split('=')
        if (p[0] === 'size' && p[1]) {
            size = Number(p[1])
        }
    })
    return size
}