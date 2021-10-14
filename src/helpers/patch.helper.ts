import * as core from 'fast-json-patch'

export function normalisePatch(patch: core.Operation | core.Operation[]) {
        return Array.isArray(patch) ? patch : Array(patch)
}

export function applyPatch<T>(document: T, patch: core.Operation | core.Operation[], validateOperation?: | core.Validator<T> | boolean, mutateDocument?: boolean) {
        let patchArray = normalisePatch(patch)
        return core.applyPatch<T>(document, patchArray, validateOperation, mutateDocument)
}

export function validate<T>(sequence: core.Operation | core.Operation[], document?: T, externalValidator?: core.Validator<T>) {
        let patchArray = normalisePatch(sequence)
        return core.validate<T>(patchArray, document, externalValidator)
}

export * from 'fast-json-patch'