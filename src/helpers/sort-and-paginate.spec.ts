import {HttpStatus} from '@nestjs/common'
import {Request} from 'express'

import {compareValues, sortAndPaginate} from './sort-and-paginate'

import {InvalidParameterException} from '~/helpers/errors.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

interface Row {
    id: number
    name: string
    flag: boolean
    rank: number | null
}

const rows: Row[] = [
    {id: 1, name: 'a10', flag: true, rank: 0},
    {id: 2, name: 'a2', flag: false, rank: null},
    {id: 3, name: 'B', flag: true, rank: 5},
]

function sr(query: Record<string, string>): ServiceRequest {
    return {req: {query} as unknown as Request} as ServiceRequest
}

const ids = (list: Row[]): number[] => list.map(row => row.id)

describe('sortAndPaginate', () => {
    it('orders strings naturally in both directions', () => {
        expect(ids(sortAndPaginate(rows, sr({order_by: 'name'})))).toEqual([2, 1, 3])
        expect(ids(sortAndPaginate(rows, sr({order_by: 'name', order_by_direction: 'DESC'})))).toEqual([3, 1, 2])
    })

    it('orders by falsy values and puts null first ascending', () => {
        expect(ids(sortAndPaginate(rows, sr({order_by: 'rank'})))).toEqual([2, 1, 3])
        expect(ids(sortAndPaginate(rows, sr({order_by: 'flag', order_by_direction: 'desc'})))).toEqual([1, 3, 2])
    })

    it('takes the default field, keeps the order without one, leaves the input alone', () => {
        const input = [...rows].reverse()
        expect(ids(sortAndPaginate(input, sr({}), 'id'))).toEqual([1, 2, 3])
        expect(ids(sortAndPaginate(input, sr({})))).toEqual([3, 2, 1])
        expect(ids(input)).toEqual([3, 2, 1])
    })

    it('pages', () => {
        expect(ids(sortAndPaginate(rows, sr({order_by: 'id', page: '2', rows: '2'})))).toEqual([3])
    })

    it.each([
        [{order_by: 'nope'}, 'order_by'],
        [{order_by_direction: 'up'}, 'order_by_direction'],
        [{page: '-1'}, 'page'],
        [{rows: '-5'}, 'rows'],
    ])('rejects %j with 400', (query, parameter) => {
        let err: InvalidParameterException
        try {
            sortAndPaginate(rows, sr(query))
        } catch (e) {
            err = e as InvalidParameterException
        }
        expect(err.getStatus()).toEqual(HttpStatus.BAD_REQUEST)
        expect(err.errorList[0].parameter).toEqual(parameter)
    })

    it('compares dates by value', () => {
        expect(compareValues(new Date(2), new Date(1))).toEqual(1)
        expect(compareValues(undefined, null)).toEqual(0)
    })
})
