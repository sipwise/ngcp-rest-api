import {ExecutionContext} from '@nestjs/common'
import {Reflector} from '@nestjs/core'

import {ReadOnlyGuard} from './read-only.guard'

describe('ReadOnlyGuard', () => {
    const mockContext = (method: string, readOnly: boolean, skipReadOnly?: boolean, onClass = false): ExecutionContext => {
        const handler = (): boolean => true
        const cls = class {}
        if (skipReadOnly !== undefined)
            Reflect.defineMetadata('skipReadOnly', skipReadOnly, onClass ? cls : handler)
        return {
            switchToHttp: () => ({getRequest: () => ({method, user: {readOnly}})}),
            getHandler: () => handler,
            getClass: () => cls,
        } as unknown as ExecutionContext
    }

    const guard = new ReadOnlyGuard(new Reflector())

    it('allows non read-only users', async () => {
        expect(await guard.canActivate(mockContext('POST', false))).toBe(true)
    })

    it('allows GET for read-only users', async () => {
        expect(await guard.canActivate(mockContext('GET', true))).toBe(true)
    })

    it('denies POST for read-only users', async () => {
        expect(await guard.canActivate(mockContext('POST', true))).toBe(false)
    })

    it('allows POST for read-only users when skipReadOnly is set on the handler', async () => {
        expect(await guard.canActivate(mockContext('POST', true, true))).toBe(true)
    })

    it('allows POST for read-only users when skipReadOnly is set on the class', async () => {
        expect(await guard.canActivate(mockContext('POST', true, true, true))).toBe(true)
    })
})
