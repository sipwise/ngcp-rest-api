import {Request} from 'express'

import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ErrorEntry, ValidationFailedException} from '~/helpers/errors.helper'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {validatePatchResellerId, validateResellerId} from '~/helpers/reseller-id.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

const admin: AuthResponseDto = {
    readOnly: false,
    showPasswords: true,
    active: true,
    id: 1,
    is_master: true,
    reseller_id: 1,
    reseller_id_required: false,
    role: 'admin',
    username: 'administrator',
}

const reseller: AuthResponseDto = {...admin, role: 'reseller', reseller_id: 2, reseller_id_required: true}

const toSr = (user: AuthResponseDto, body?: unknown): ServiceRequest =>
    ({returnContent: true, headers: [undefined], params: undefined, query: undefined, user: user, req: {body} as Request})

const errors = (fn: () => void): ErrorEntry[] => {
    try {
        fn()
    } catch (err) {
        expect(err).toBeInstanceOf(ValidationFailedException)
        return (err as ValidationFailedException).errorList
    }
    throw new Error('expected ValidationFailedException')
}

const missing = (pointer: string): ErrorEntry => ({pointer, code: 'isNotEmpty', message: 'reseller_id should not be empty'})
const notAllowed = (pointer: string): ErrorEntry => ({pointer, code: 'whitelistValidation', message: 'property reseller_id should not exist'})

describe('reseller-id.helper', () => {
    describe('validateResellerId', () => {
        it('should accept reseller_id for admin roles', () => {
            expect(() => validateResellerId([{reseller_id: 1}], toSr(admin))).not.toThrow()
        })

        it('should require reseller_id for admin roles', () => {
            const dtos = [{reseller_id: 1}, {}, {reseller_id: null}]
            expect(errors(() => validateResellerId(dtos, toSr(admin, dtos))))
                .toEqual([missing('/1/reseller_id'), missing('/2/reseller_id')])
        })

        it('should not require reseller_id for admin roles if not required', () => {
            expect(() => validateResellerId([{}, {reseller_id: null}], toSr(admin), {required: false})).not.toThrow()
        })

        it('should accept missing reseller_id for reseller roles', () => {
            expect(() => validateResellerId([{}], toSr(reseller))).not.toThrow()
        })

        it('should reject reseller_id for reseller roles', () => {
            const dtos = new Dictionary<{reseller_id?: number}>('5', {reseller_id: 2})
            expect(errors(() => validateResellerId(dtos, toSr(reseller, {5: {reseller_id: 2}}))))
                .toEqual([notAllowed('/5/reseller_id')])
        })

        it('should reject null reseller_id for reseller roles even if not required', () => {
            expect(errors(() => validateResellerId([{reseller_id: null}], toSr(reseller, {reseller_id: null}), {required: false})))
                .toEqual([notAllowed('/reseller_id')])
        })
    })

    describe('validatePatchResellerId', () => {
        const patches = (ops: PatchOperation[]): Dictionary<PatchOperation[]> => new Dictionary('3', ops)

        it('should accept patches without reseller_id', () => {
            const ops: PatchOperation[] = [{op: 'replace', path: '/name', value: 'foo'}]
            expect(() => validatePatchResellerId(patches(ops), toSr(admin))).not.toThrow()
            expect(() => validatePatchResellerId(patches(ops), toSr(reseller))).not.toThrow()
        })

        it('should accept reseller_id replace for admin roles', () => {
            const ops: PatchOperation[] = [{op: 'replace', path: '/reseller_id', value: 2}]
            expect(() => validatePatchResellerId(patches(ops), toSr(admin))).not.toThrow()
        })

        it('should reject emptying reseller_id for admin roles', () => {
            const tt: PatchOperation[][] = [
                [{op: 'replace', path: '/reseller_id', value: null}],
                [{op: 'remove', path: '/reseller_id'}],
            ]
            for (const ops of tt) {
                expect(errors(() => validatePatchResellerId(patches(ops), toSr(admin, ops))))
                    .toEqual([missing('/reseller_id')])
            }
        })

        it('should allow emptying reseller_id for admin roles if not required', () => {
            const ops: PatchOperation[] = [{op: 'replace', path: '/reseller_id', value: null}]
            expect(() => validatePatchResellerId(patches(ops), toSr(admin), {required: false})).not.toThrow()
        })

        it('should reject any reseller_id op for reseller roles', () => {
            const ops: PatchOperation[] = [{op: 'replace', path: '/reseller_id', value: 2}]
            expect(errors(() => validatePatchResellerId(patches(ops), toSr(reseller, {3: ops}))))
                .toEqual([notAllowed('/3/reseller_id')])
        })
    })
})
