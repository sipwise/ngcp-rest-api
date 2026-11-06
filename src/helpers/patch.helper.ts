import {plainToInstance} from 'class-transformer'
import {validate as classValidate} from 'class-validator'
import * as core from 'fast-json-patch'

import {
    ErrorListException,
    ValidationFailedException,
    escapePointerToken,
    formatValidationErrors,
    isErrorListException,
    jsonPatchException,
    mergeErrorListExceptions,
} from './errors.helper'

import {RequestDto} from '~/dto/request.dto'
import {Dictionary} from '~/helpers/dictionary.helper'

export function normalisePatch(patch: core.Operation | core.Operation[]): core.Operation[] {
    return Array.isArray(patch) ? patch : Array(patch)
}

export function applyPatch<T>(document: T, patch: core.Operation | core.Operation[], validateOperation?: | core.Validator<T> | boolean, mutateDocument?: boolean): core.PatchResult<T> {
    const patchArray = normalisePatch(patch)
    return core.applyPatch<T>(document, patchArray, validateOperation, mutateDocument)
}

export function validate<T>(sequence: core.Operation | core.Operation[], document?: T, externalValidator?: core.Validator<T>): core.JsonPatchError {
    const patchArray = normalisePatch(sequence)
    return core.validate<T>(patchArray, document, externalValidator)
}

/**
 * Throws INVALID_JSON_PATCH (400) if the patch document is not well-formed (RFC 6902)
 * @param patch operations
 * @param base pointer of the patch document in the request body
 */
export function assertJsonPatch(patch: unknown, base = ''): void {
    if (!Array.isArray(patch)) {
        const err = validate(patch as core.Operation)
        if (err)
            throw jsonPatchException(err, 0, base)
        return
    }
    const errors: ErrorListException[] = []
    patch.forEach((op, index) => {
        const err = core.validate([op])
        if (err)
            errors.push(jsonPatchException(err, index, base))
    })
    if (errors.length)
        throw mergeErrorListExceptions(errors)
}

// a replace or remove of a field missing in the request dto (unset optional field) is not a conflict
const lenientValidator: core.Validator<unknown> = (operation, index, document, existingPath) => {
    if ((operation.op == 'replace' || operation.op == 'remove')
        && operation.path.split('/').length == existingPath.split('/').length + 1)
        return
    core.validator(operation, index, document, existingPath)
}

/**
 * Applies the patch operation by operation; failing operations (test, unresolvable paths) return
 * JSON_PATCH_CONFLICT (409) with a pointer into the patch document
 */
function applyToDocument<T>(document: T, patch: core.Operation[], base: string): T {
    patch.forEach((op, index) => {
        try {
            document = core.applyOperation<T>(document, op, lenientValidator as core.Validator<T>, true, true, index).newDocument
        } catch (err) {
            if (err instanceof core.JsonPatchError)
                throw jsonPatchException(err, index, base)
            throw err
        }
    })
    return document
}

function topLevelKey(path: string): string {
    return path?.split('/')[1]?.replace(/~1/g, '/').replace(/~0/g, '~')
}

/**
 * Applies a JSON Patch to an internal entity through its request dto.
 * 400 malformed patch, 409 patch conflicts with the entity, 422 patched fields fail the request dto validation
 * (also paths outside the request dto). Pointers start with `base` (`/<id>` in bulk PATCH).
 */
export async function patchToEntity<T extends {id?: number}, D extends RequestDto>(oldEntity: T, patch: core.Operation[], requestDto: new(oldEntity: T) => D, base = ''): Promise<T> {
    assertJsonPatch(patch, base)
    const patchEntity = Object.assign(Object.create(oldEntity), oldEntity)
    const dto = applyToDocument(new requestDto(patchEntity), patch, base)
    // only the patched fields are validated, as a request body (nested dtos, dates)
    const keys = new Set(patch.filter(op => op.op != 'test').map(op => topLevelKey(op.path)).filter(key => key != null))
    const values = Object.assign(new requestDto(null), Object.fromEntries([...keys].map(key => [key, dto[key]])))
    const reqDto = plainToInstance(requestDto, values)
    const options = {whitelist: true, forbidNonWhitelisted: true}
    let errors = await classValidate(reqDto, {...options, skipMissingProperties: true})
    // emptied fields (remove, null) are skipped above; they must be optional in the request dto
    const emptied = [...keys].filter(key => dto[key] == null)
    if (emptied.length)
        errors = errors.concat((await classValidate(reqDto, options)).filter(err => emptied.includes(err.property)))
    if (errors.length)
        throw new ValidationFailedException(formatValidationErrors(errors, base))
    for (const key of keys) {
        if (reqDto[key] !== undefined)
            dto[key] = reqDto[key]
    }
    const entity: T = Object.assign(patchEntity, dto.toInternal({id: +oldEntity.id}))
    return entity
}

/**
 * patchToEntity for a bulk PATCH; every failing item is reported (pointers `/<id>/...`)
 * @param patches operations by id
 * @param read reads the entity of an id
 * @param requestDto request dto class
 */
export async function patchManyToEntities<T extends {id?: number}, D extends RequestDto>(patches: Dictionary<core.Operation[]>, read: (id: number) => Promise<T>, requestDto: new(oldEntity: T) => D): Promise<Dictionary<T>> {
    const entities = new Dictionary<T>()
    const errors: ErrorListException[] = []
    for (const id of Object.keys(patches)) {
        try {
            entities[id] = await patchToEntity<T, D>(await read(+id), patches[id], requestDto, `/${escapePointerToken(id)}`)
        } catch (err) {
            if (!isErrorListException(err))
                throw err
            errors.push(err)
        }
    }
    if (errors.length)
        throw mergeErrorListExceptions(errors)
    return entities
}

export * from 'fast-json-patch'
