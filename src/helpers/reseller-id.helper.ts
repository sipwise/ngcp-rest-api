import {Dictionary} from '~/helpers/dictionary.helper'
import {ErrorEntry, ValidationFailedException, bodyItemPointer} from '~/helpers/errors.helper'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface ResellerIdValidationOptions {
    // admin and system roles must provide a reseller_id
    required?: boolean
}

type WithResellerId = {reseller_id?: number | string | null}

function resellerIdNotAllowed(itemPointer: string): ErrorEntry {
    return {pointer: `${itemPointer}/reseller_id`, code: 'whitelistValidation', message: 'property reseller_id should not exist'}
}

function resellerIdMissing(itemPointer: string): ErrorEntry {
    return {pointer: `${itemPointer}/reseller_id`, code: 'isNotEmpty', message: 'reseller_id should not be empty'}
}

// a single PATCH body is the array of operations, a bulk one is keyed by id
function patchItemPointer(sr: ServiceRequest, id: string): string {
    const body: unknown = sr.req?.body
    return Array.isArray(body) ? '' : bodyItemPointer(body, id)
}

/**
 * Admin and system roles must provide reseller_id (unless options.required is false),
 * reseller roles must not provide it as it is set to the reseller_id of the user.
 */
export function validateResellerId(
    dtos: WithResellerId[] | Dictionary<WithResellerId>,
    sr: ServiceRequest,
    options: ResellerIdValidationOptions = {},
): void {
    const required = options.required ?? true
    const errors: ErrorEntry[] = []
    // items of an uploaded file (csv import) are rows: `/<row>/reseller_id`
    const body: unknown = sr.req?.file ? dtos : sr.req?.body
    for (const [key, dto] of Object.entries(dtos)) {
        if (sr.user.reseller_id_required && dto.reseller_id !== undefined)
            errors.push(resellerIdNotAllowed(bodyItemPointer(body, key)))
        else if (required && !sr.user.reseller_id_required && dto.reseller_id == null)
            errors.push(resellerIdMissing(bodyItemPointer(body, key)))
    }
    if (errors.length)
        throw new ValidationFailedException(errors)
}

export function validatePatchResellerId(
    patches: Dictionary<PatchOperation[]>,
    sr: ServiceRequest,
    options: ResellerIdValidationOptions = {},
): void {
    const required = options.required ?? true
    const errors: ErrorEntry[] = []
    for (const [id, patch] of Object.entries(patches)) {
        const ops = patch.filter(op => op.path.split('/')[1] == 'reseller_id')
        if (!ops.length)
            continue
        if (sr.user.reseller_id_required)
            errors.push(resellerIdNotAllowed(patchItemPointer(sr, id)))
        else if (required && ops.some(op => op.op == 'remove' || ('value' in op && op.value == null)))
            errors.push(resellerIdMissing(patchItemPointer(sr, id)))
    }
    if (errors.length)
        throw new ValidationFailedException(errors)
}
