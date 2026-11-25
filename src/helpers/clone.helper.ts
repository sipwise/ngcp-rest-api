import {plainToInstance} from 'class-transformer'

import {ValidationFailedException, formatValidationErrors} from '~/helpers/errors.helper'
import {validateEmptiedFields} from '~/helpers/patch.helper'

const cloneNameCandidates = 50

/**
 * Internal entity of the field overrides of a clone request. Fields missing in the body stay undefined.
 * null on a field the request dto requires is a 422 with a body pointer.
 */
export async function cloneOverrides<T, D extends {toInternal(): T}>(dto: object, requestDto: new(entity?: T) => D): Promise<T> {
    // mapped type bodies have no methods, toInternal comes from an instance of the original request dto
    const instance = Object.assign(new requestDto(), dto)
    const emptied = Object.keys(dto).filter(key => dto[key] === null)
    if (emptied.length) {
        const errors = await validateEmptiedFields(plainToInstance(requestDto, instance), emptied)
        if (errors.length)
            throw new ValidationFailedException(formatValidationErrors(errors))
    }
    return instance.toInternal()
}

/**
 * Copy of `source` without its id and the `notCopied` fields, with every override that is not undefined
 * applied (null clears the field)
 */
export function cloneEntity<T extends {id?: number}>(source: T, overrides: T, notCopied: (keyof T)[] = []): T {
    const clone: T = Object.assign(Object.create(Object.getPrototypeOf(source)), source)
    delete clone.id
    for (const key of notCopied)
        delete clone[key]
    for (const [key, value] of Object.entries(overrides)) {
        if (value !== undefined)
            clone[key] = value
    }
    return clone
}

/**
 * The first of `<name>_clone`, `<name>_clone2` ... `<name>_clone50` not returned by `readTaken`, the name cut
 * so the result fits `maxLength`. If all are taken, the first is returned and the insert fails as a duplicate.
 */
export async function uniqueCloneName(name: string, maxLength: number, readTaken: (candidates: string[]) => Promise<string[]>): Promise<string> {
    const candidates: string[] = []
    for (let i = 1; i <= cloneNameCandidates; i++) {
        const suffix = i == 1 ? '_clone' : `_clone${i}`
        candidates.push(name.slice(0, maxLength - suffix.length) + suffix)
    }
    const taken = new Set((await readTaken(candidates)).map(takenName => takenName.toLowerCase()))
    return candidates.find(candidate => !taken.has(candidate.toLowerCase())) ?? candidates[0]
}
