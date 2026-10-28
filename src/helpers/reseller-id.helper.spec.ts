import {UnprocessableEntityException} from '@nestjs/common'

import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {Dictionary} from '~/helpers/dictionary.helper'
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

const toSr = (user: AuthResponseDto): ServiceRequest =>
    ({returnContent: true, headers: [undefined], params: undefined, query: undefined, user: user, req: undefined})

const messages = (fn: () => void): string[] => {
    try {
        fn()
    } catch (err) {
        expect(err).toBeInstanceOf(UnprocessableEntityException)
        return ((err as UnprocessableEntityException).getResponse() as {message: string[]}).message
    }
    throw new Error('expected UnprocessableEntityException')
}

describe('reseller-id.helper', () => {
    describe('validateResellerId', () => {
        it('should accept reseller_id for admin roles', () => {
            expect(() => validateResellerId([{reseller_id: 1}], toSr(admin))).not.toThrow()
        })

        it('should require reseller_id for admin roles', () => {
            expect(messages(() => validateResellerId([{reseller_id: 1}, {}, {reseller_id: null}], toSr(admin))))
                .toEqual(['[1] reseller_id should not be empty', '[2] reseller_id should not be empty'])
        })

        it('should not require reseller_id for admin roles if not required', () => {
            expect(() => validateResellerId([{}, {reseller_id: null}], toSr(admin), {required: false})).not.toThrow()
        })

        it('should accept missing reseller_id for reseller roles', () => {
            expect(() => validateResellerId([{}], toSr(reseller))).not.toThrow()
        })

        it('should reject reseller_id for reseller roles', () => {
            const dtos = new Dictionary<{reseller_id?: number}>('5', {reseller_id: 2})
            expect(messages(() => validateResellerId(dtos, toSr(reseller))))
                .toEqual(['[5] property reseller_id should not exist'])
        })

        it('should reject null reseller_id for reseller roles even if not required', () => {
            expect(messages(() => validateResellerId([{reseller_id: null}], toSr(reseller), {required: false})))
                .toEqual(['[0] property reseller_id should not exist'])
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
                expect(messages(() => validatePatchResellerId(patches(ops), toSr(admin))))
                    .toEqual(['[3] reseller_id should not be empty'])
            }
        })

        it('should allow emptying reseller_id for admin roles if not required', () => {
            const ops: PatchOperation[] = [{op: 'replace', path: '/reseller_id', value: null}]
            expect(() => validatePatchResellerId(patches(ops), toSr(admin), {required: false})).not.toThrow()
        })

        it('should reject any reseller_id op for reseller roles', () => {
            const ops: PatchOperation[] = [{op: 'replace', path: '/reseller_id', value: 2}]
            expect(messages(() => validatePatchResellerId(patches(ops), toSr(reseller))))
                .toEqual(['[3] property reseller_id should not exist'])
        })
    })
})
