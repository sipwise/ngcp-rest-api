import {idPointer} from '~/helpers/errors.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

describe('errors.helper', () => {
    describe('idPointer', () => {
        const sr = (method: string, body: unknown): ServiceRequest => ({req: {method, body}} as unknown as ServiceRequest)

        it('points at the first index of the id in a DELETE body', () => {
            const request = sr('DELETE', [5, '7', 5, 9])
            expect(idPointer(request, 5)).toBe('/0')
            expect(idPointer(request, 7)).toBe('/1')
            expect(idPointer(request, '9')).toBe('/3')
            expect(idPointer(request, 8)).toBe('')
        })

        it('points at the item of the id in other bulk requests', () => {
            expect(idPointer(sr('PUT', {5: {}}), 5)).toBe('/5')
        })
    })
})
