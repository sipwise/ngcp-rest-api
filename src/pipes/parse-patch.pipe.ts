import {ArgumentMetadata, Injectable, PipeTransform} from '@nestjs/common'

import {Operation, assertJsonPatch, normalisePatch} from '~/helpers/patch.helper'

/**
 * Checks that the body is a well-formed JSON Patch (400 INVALID_JSON_PATCH with pointers into the patch document)
 */
@Injectable()
export class ParsePatchPipe implements PipeTransform {
    async transform(value: unknown, _metadata: ArgumentMetadata): Promise<Operation[]> {
        assertJsonPatch(value)
        return normalisePatch(value as Operation[])
    }
}
