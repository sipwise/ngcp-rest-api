import {CallHandler, ExecutionContext, NestInterceptor} from '@nestjs/common'
import {isObject} from 'class-validator'
import {Observable} from 'rxjs'
import {tap} from 'rxjs/operators'

import Context from '~/helpers/context.helper'
import {obfuscatePasswordQuery, obfuscatePasswordUrl} from '~/helpers/password-obfuscator.helper'
import {LoggerService} from '~/logger/logger.service'

const maxLoggedIds = 100

/**
 * LoggingInterceptor writes a RESPONSE line for every successful request.
 * It sits outside ResponseSerializerInterceptor and gets the serialized data.
 */
export class LoggingInterceptor implements NestInterceptor {
    private readonly log = new LoggerService(LoggingInterceptor.name)

    intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
        return next.handle().pipe(
            tap(data => {
                if (!this.log.isEnabled('log'))
                    return
                const req = context.switchToHttp().getRequest()
                const ctx = Context.get(req)
                const now = Date.now()
                this.log.log({
                    message: 'RESPONSE',
                    tx: ctx.txid,
                    username: req['user'] !== undefined ? req.user.username : 'unknown',
                    role: {
                        role: req['user'] !== undefined ? req.user.role : 'unknown',
                        is_master: req['user'] !== undefined ? req.user.is_master : 'unknown',
                    },
                    ip: req.header('x-real-ip') ?? req.ip,
                    url: `${req.protocol}://${req.header('host')}${obfuscatePasswordUrl(req.url)}`,
                    query_params: obfuscatePasswordQuery(req.query),
                    content_type: req.header('content-type'),
                    method: req.method,
                    received_at: ctx.startTime,
                    response_at: now,
                    elapsed: now - ctx.startTime,
                    body: this.loggedBody(data),
                })
            }),
        )
    }

    // collections (`[items, total_count]`) and bulk results (plain arrays) are
    // summarized, their size is up to the client; single objects are logged as is
    private loggedBody(data: unknown): unknown {
        if (isObject(data) && 'stream' in data)
            return 'stream'
        if (!Array.isArray(data))
            return data
        const [items, totalCount] = data
        if (data.length == 2 && Array.isArray(items) && typeof totalCount == 'number')
            return {...this.summarize(items), total_count: totalCount}
        return this.summarize(data)
    }

    private summarize(items: unknown[]): {count: number, ids: unknown[]} {
        const ids = items
            .slice(0, maxLoggedIds)
            .map(item => isObject(item) && 'id' in item ? item.id : null)
        return {count: items.length, ids}
    }
}
