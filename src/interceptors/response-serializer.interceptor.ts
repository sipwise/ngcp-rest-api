import {CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile} from '@nestjs/common'
import {instanceToPlain} from 'class-transformer'
import {Observable} from 'rxjs'
import {mergeMap} from 'rxjs/operators'

import {mapYield} from '~/helpers/yield.helper'

/**
 * Turns response class instances into plain objects (`@Exclude`, `@Expose`, `@Transform`), as Nest's
 * ClassSerializerInterceptor does, but item by item with yields: collections can hold thousands of items.
 */
@Injectable()
export class ResponseSerializerInterceptor implements NestInterceptor {
    intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
        return next.handle().pipe(mergeMap(response => serializeResponse(response)))
    }
}

export async function serializeResponse(response: unknown): Promise<unknown> {
    if (typeof response != 'object' || response === null || response instanceof StreamableFile)
        return response
    if (!Array.isArray(response))
        return instanceToPlain(response)
    // collections: `[items, count]` or a plain array of items
    return await mapYield(response, item => Array.isArray(item) ? mapYield(item, toPlain) : toPlain(item))
}

function toPlain(item: unknown): unknown {
    return item ? instanceToPlain(item) : item
}
