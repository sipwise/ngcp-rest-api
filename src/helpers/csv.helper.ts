import {Readable} from 'stream'

import {StreamableFile, UnprocessableEntityException} from '@nestjs/common'
import {plainToClass} from 'class-transformer'
import {validate} from 'class-validator'
import {Response} from 'express'
import * as Papa from 'papaparse'

import {formatValidationErrorsInCsv} from './errors.helper'

import {CsvValidationError} from '~/types/csv-validation-error.type'

/**
 * Converts UTF-8CSV file buffer to an array of the provided DTO type.
 *
 */
export async function csvToDto<T extends object>(file: Express.Multer.File, dtoClass: new () => T): Promise<T[] | null> {
    return new Promise((resolve, reject) => {
        const errors: CsvValidationError[] = []
        const stream = Readable.from(file.buffer.toString('utf-8'))
        Papa.parse(stream, {
            header: true,
            skipEmptyLines: true,
            delimiter: ',',
            encoding: 'utf-8',
            complete: async (result) => {
                const rows = result.data
                if (!rows || rows.length === 0) {
                    resolve(null)
                    return
                }

                const dtos = rows.map((row, idx) => {
                    const dto = {idx, data: plainToClass(dtoClass, row)}
                    return dto
                })

                const validationPromises = dtos.map(async dto => {
                    const validationErrors = await validate(dto.data)
                    if (validationErrors.length > 0) {
                        validationErrors.forEach(error => {
                            if (!error.target) error.target = {}
                            error.target['row'] = dto.idx
                        })
                        errors.push({row: dto.idx, error: validationErrors})
                    }
                })

                try {
                    await Promise.all(validationPromises)
                    if (errors.length > 0) {
                        reject(new UnprocessableEntityException(formatValidationErrorsInCsv(errors)))
                    } else {
                        resolve(dtos.map(dto => dto.data))
                    }
                } catch {
                    resolve(null)
                }
            },
            error: (error) => {
                reject(error)
            },
        })
    })
}

/**
 * Converts an array of the provided DTO type to a UTF-8 CSV string.
 *
 */
export async function dtoToCsv<T extends object>(dtos: T[]): Promise<string> {
    const csv = Papa.unparse(dtos, {
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
    const size = extractContentSize(stream.options.disposition)
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