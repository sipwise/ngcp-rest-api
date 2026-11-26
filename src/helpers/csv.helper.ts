import {Readable} from 'stream'

import {PayloadTooLargeException, StreamableFile, UnprocessableEntityException} from '@nestjs/common'
import {plainToInstance} from 'class-transformer'
import {ValidationError} from 'class-validator'
import {Response} from 'express'
import * as Papa from 'papaparse'

import {ErrorEntry, ValidationFailedException, formatValidationErrors} from './errors.helper'
import {formatSize, readFileLimit, readRowsLimit, writeItemsLimit} from './request-limits.helper'
import {validate} from './validate.helper'
import {forEachYield, mapYield} from './yield.helper'

import {errorMessage} from '~/helpers/errors.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface CsvOptions {
    numericBooleans?: boolean
}
/**
 * Converts UTF-8CSV file buffer to an array of the provided DTO type.
 * Parsing stops with 413 once the file has more rows than write_items_limit.
 */
export async function csvToDto<T extends object>(file: Express.Multer.File, dtoClass: new () => T): Promise<T[] | null> {
    const max = writeItemsLimit()
    const rows = await new Promise<object[]>((resolve, reject) => {
        const rows: object[] = []
        const stream = Readable.from(file.buffer.toString('utf-8'))
        stream.on('error', reject)
        Papa.parse(stream, {
            header: true,
            skipEmptyLines: true,
            delimiter: ',',
            encoding: 'utf-8',
            step: (result: Papa.ParseStepResult<object>, parser: Papa.Parser) => {
                rows.push(result.data)
                // abort() calls complete, so reject first
                if (rows.length > max) {
                    reject(new PayloadTooLargeException(errorMessage('CSV_TOO_MANY_ROWS', {max})))
                    parser.abort()
                }
            },
            complete: () => resolve(rows),
            error: reject,
        })
    })

    if (rows.length === 0)
        return null

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

const CSV_CHUNK_ROWS = 1000
const CSV_NEWLINE = '\r\n'

/**
 * The CSV of every row the collection read returns for the request, regardless of its rows and page: read in
 * pages of read_rows_limit rows, unparsed in chunks with yields; 422 once it grows above read_file_limit
 */
export async function readAllAsCsv<T>(
    sr: ServiceRequest,
    readPage: (sr: ServiceRequest) => Promise<[T[], number]>,
    toRow: (item: T) => object,
    options?: CsvOptions,
): Promise<string> {
    const rows = readRowsLimit()
    const maxBytes = readFileLimit()
    const csvChunks: string[] = []
    let bytes = 0
    let columns: string[]
    for (let page = 1; ; page++) {
        const [items] = await readPage(pageRequest(sr, page, rows))
        const records = await mapYield(items, item => options?.numericBooleans
            ? booleansToNumeric(toRow(item))
            : toRow(item))
        columns ??= records.length ? Object.keys(records[0]) : undefined
        const chunks: object[][] = []
        for (let start = 0; start < records.length; start += CSV_CHUNK_ROWS)
            chunks.push(records.slice(start, start + CSV_CHUNK_ROWS))
        await forEachYield(chunks, chunk => {
            const csv = Papa.unparse(chunk, {
                delimiter: ',',
                newline: CSV_NEWLINE,
                header: csvChunks.length == 0,
                columns,
            })
            bytes += Buffer.byteLength(csv) + (csvChunks.length ? CSV_NEWLINE.length : 0)
            if (bytes > maxBytes)
                throw new UnprocessableEntityException(errorMessage('EXPORT_TOO_LARGE', {max: formatSize(maxBytes)}))
            csvChunks.push(csv)
        })
        if (items.length < rows)
            break
    }
    return csvChunks.join(CSV_NEWLINE)
}

function pageRequest(sr: ServiceRequest, page: number, rows: number): ServiceRequest {
    return {...sr, query: {...sr.query, page: `${page}`, rows: `${rows}`}}
}

function booleansToNumeric(dto: object): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(dto))
        result[key] = typeof value === 'boolean' ? (value ? '1' : '0') : value
    return result
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