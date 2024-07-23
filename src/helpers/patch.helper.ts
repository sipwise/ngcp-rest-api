import {RequestDto} from '../dto/request.dto'
import * as core from 'fast-json-patch'
import {validate as classValidate} from 'class-validator'
import {BadRequestException, UnprocessableEntityException} from '@nestjs/common'
import {formatValidationErrors} from '../helpers/errors.helper'

export function normalisePatch(patch: core.Operation | core.Operation[]) {
    return Array.isArray(patch) ? patch : Array(patch)
}

export function applyPatch<T>(document: T, patch: core.Operation | core.Operation[], validateOperation?: | core.Validator<T> | boolean, mutateDocument?: boolean) {
    const patchArray = normalisePatch(patch)
    return core.applyPatch<T>(document, patchArray, validateOperation, mutateDocument)
}

export function validate<T>(sequence: core.Operation | core.Operation[], document?: T, externalValidator?: core.Validator<T>) {
    const patchArray = normalisePatch(sequence)
    return core.validate<T>(patchArray, document, externalValidator)
}

export async function patchToEntity<T extends {id?: number}, D extends RequestDto>(oldEntity: T, patch: core.Operation[], requestDto: new(oldEntity: T) => D): Promise<T> {
    const err = validate(patch)
    if (err) {
        const message = err.message.replace(/[\n\s]+/g, ' ').replace(/"/g, '\'')
        throw new BadRequestException(message)
    }
    const patchEntity = Object.assign(Object.create(oldEntity), oldEntity)
    const dto = applyPatch(new requestDto(patchEntity), patch).newDocument
    const entity: T = Object.assign(patchEntity, dto.toInternal({id: +oldEntity.id}))
    const errors = await classValidate(entity)
    if (errors && errors.length)
        throw new UnprocessableEntityException(formatValidationErrors(errors))
    return entity
}

export * from 'fast-json-patch'
