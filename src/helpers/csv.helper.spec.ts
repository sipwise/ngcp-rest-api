import {HttpStatus} from '@nestjs/common'
import {IsString} from 'class-validator'
import * as Papa from 'papaparse'

import {AppService} from '~/app.service'
import {csvToDto, readAllAsCsv} from '~/helpers/csv.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

class CsvRowDto {
    @IsString()
        name: string
}

describe('csv.helper', () => {
    const savedPerformance = AppService.config.performance

    afterEach(() => {
        AppService.config.performance = savedPerformance
    })

    describe('readAllAsCsv', () => {
        const rows = Array.from({length: 2500}, (_, i) => ({
            id: `${i}`,
            name: i % 7 ? `Name "${i}", Ltd` : `=cmd${i}\nline`,
            own: i % 2 == 0,
            empty: i % 3 ? null : undefined,
        }))
        const query = {name: 'x*', page: '3', rows: '7'}
        const sr = {query} as unknown as ServiceRequest
        let pages: string[][]

        // the first `length` rows of the fixture as a paged collection read
        function readPage(length: number) {
            return (sr: ServiceRequest): Promise<[typeof rows, number]> => {
                const page = +sr.query.page
                const size = +sr.query.rows
                pages.push([`${page}`, `${size}`])
                return Promise.resolve([rows.slice(0, length).slice((page - 1) * size, page * size), length])
            }
        }

        beforeEach(() => {
            pages = []
            AppService.config.performance = {read_rows_limit: 1000}
        })

        it('writes the same CSV as one unparse of all rows', async () => {
            for (const length of [1, 1000, 1001, 2500]) {
                const csv = await readAllAsCsv(sr, readPage(length), row => row)
                expect(csv).toBe(Papa.unparse(rows.slice(0, length), {delimiter: ',', header: true}))
            }
        })

        it('reads pages of read_rows_limit rows until a short page', async () => {
            await readAllAsCsv(sr, readPage(1000), row => row)
            expect(pages).toEqual([['1', '1000'], ['2', '1000']])
            pages = []
            await readAllAsCsv(sr, readPage(2500), row => row)
            expect(pages).toEqual([['1', '1000'], ['2', '1000'], ['3', '1000']])
        })

        it('keeps the query of the request', async () => {
            await readAllAsCsv(sr, readPage(2500), row => row)
            expect(sr.query).toEqual({name: 'x*', page: '3', rows: '7'})
        })

        it('writes booleans as 1/0 with numericBooleans', async () => {
            const csv = await readAllAsCsv(sr, readPage(2), row => row, {numericBooleans: true})
            expect(csv).toBe('id,name,own,empty\r\n0,"=cmd0\nline",1,\r\n1,"Name ""1"", Ltd",0,')
        })

        it('writes nothing for no rows', async () => {
            expect(await readAllAsCsv(sr, readPage(0), row => row)).toBe('')
        })

        it('rejects an export above read_file_limit with 422 EXPORT_TOO_LARGE', async () => {
            AppService.config.performance = {read_rows_limit: 1000, read_file_limit: '100b'}
            await expect(readAllAsCsv(sr, readPage(2500), row => row)).rejects.toThrow(expect.objectContaining({
                status: HttpStatus.UNPROCESSABLE_ENTITY,
                response: {
                    errorCode: 'EXPORT_TOO_LARGE',
                    message: 'The export is larger than the 100b allowed, narrow it down with search filters',
                },
            }))
        })
    })

    describe('csvToDto', () => {
        const file = (csv: string): Express.Multer.File => ({buffer: Buffer.from(csv)}) as Express.Multer.File

        it('rejects more rows than write_items_limit with 413 CSV_TOO_MANY_ROWS', async () => {
            AppService.config.performance = {write_items_limit: 2}
            await expect(csvToDto(file('name\na\nb\nc\n'), CsvRowDto)).rejects.toThrow(expect.objectContaining({
                status: HttpStatus.PAYLOAD_TOO_LARGE,
                response: {errorCode: 'CSV_TOO_MANY_ROWS', message: 'The file has more than the 2 rows allowed per request'},
            }))
        })

        it('converts the rows up to write_items_limit', async () => {
            AppService.config.performance = {write_items_limit: 2}
            const dtos = await csvToDto(file('name\na\nb\n'), CsvRowDto)
            expect(dtos.map(dto => dto.name)).toEqual(['a', 'b'])
        })
    })
})
