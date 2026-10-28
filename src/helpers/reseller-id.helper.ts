import {UnprocessableEntityException} from '@nestjs/common'

import {Dictionary} from '~/helpers/dictionary.helper'
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface ResellerIdValidationOptions {
    // admin and system roles must provide a reseller_id
    required?: boolean
}

type WithResellerId = {reseller_id?: number | string | null}

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
    const errors: string[] = []
    for (const [key, dto] of Object.entries(dtos)) {
        if (sr.user.reseller_id_required && dto.reseller_id !== undefined)
            errors.push(`[${key}] property reseller_id should not exist`)
        else if (required && !sr.user.reseller_id_required && dto.reseller_id == null)
            errors.push(`[${key}] reseller_id should not be empty`)
    }
    if (errors.length)
        throw new UnprocessableEntityException(errors)
}

export function validatePatchResellerId(
    patches: Dictionary<PatchOperation[]>,
    sr: ServiceRequest,
    options: ResellerIdValidationOptions = {},
): void {
    const required = options.required ?? true
    const errors: string[] = []
    for (const [id, patch] of Object.entries(patches)) {
        const ops = patch.filter(op => op.path.split('/')[1] == 'reseller_id')
        if (!ops.length)
            continue
        if (sr.user.reseller_id_required)
            errors.push(`[${id}] property reseller_id should not exist`)
        else if (required && ops.some(op => op.op == 'remove' || ('value' in op && op.value == null)))
            errors.push(`[${id}] reseller_id should not be empty`)
    }
    if (errors.length)
        throw new UnprocessableEntityException(errors)
}
