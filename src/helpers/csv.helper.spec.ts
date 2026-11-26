import * as Papa from 'papaparse'

import {dtoToCsv} from '~/helpers/csv.helper'

describe('csv.helper', () => {
    describe('dtoToCsv', () => {
        const rows = Array.from({length: 2500}, (_, i) => ({
            id: `${i}`,
            name: i % 7 ? `Name "${i}", Ltd` : `=cmd${i}\nline`,
            own: i % 2 == 0,
            empty: i % 3 ? null : undefined,
        }))

        it('writes the same CSV as one unparse of all rows', async () => {
            for (const length of [1, 1000, 1001, 2500])
                expect(await dtoToCsv(rows.slice(0, length))).toBe(Papa.unparse(rows.slice(0, length), {delimiter: ',', header: true}))
        })

        it('writes booleans as 1/0 with numericBooleans', async () => {
            const csv = await dtoToCsv(rows.slice(0, 2), {numericBooleans: true})
            expect(csv).toBe('id,name,own,empty\r\n0,"=cmd0\nline",1,\r\n1,"Name ""1"", Ltd",0,')
        })

        it('writes nothing for no rows', async () => {
            expect(await dtoToCsv([])).toBe('')
        })
    })
})
