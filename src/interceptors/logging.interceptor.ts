import {CallHandler, ExecutionContext, NestInterceptor} from '@nestjs/common'
import {isObject} from 'class-validator'
import {Observable} from 'rxjs'
import {mergeMap} from 'rxjs/operators'

import Context from '~/helpers/context.helper'
import {obfuscatePasswordQuery, obfuscatePasswordUrl} from '~/helpers/password-obfuscator.helper'
import {serializeResponse} from '~/interceptors/response-serializer.interceptor'
import {LoggerService} from '~/logger/logger.service'

/**
 * LoggingInterceptor intercepts requests and writes relevant information to log.
 */
export class LoggingInterceptor implements NestInterceptor {
    private readonly log = new LoggerService(LoggingInterceptor.name)

    /**
     * Intercept implements the response logging part for all HTTP requests
     *
     * @param context ExecutionContext to access HTTP request
     * @param next  Next CallHandler
     *
     * @returns data unmodified as received
     */
    intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> | Promise<Observable<unknown>> {
        return next.handle().pipe(
            mergeMap(async data => {
                // TODO: only log to console when executed in Debug mode
                const httpCtx = context.switchToHttp()
                const req = httpCtx.getRequest()

                // Get redacted version of response data
                const redacted: unknown = await this.getRedactedPlain(data)

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
                    body: redacted,
                })
                return data
            }),
        )
    }

    /**
     * Returns redacted response data as single plain object or array of plain objects
     * @param data Object or array of objects
     * @private
     */
    private async getRedactedPlain(data: unknown): Promise<unknown> {
        this.log.debug('generating redacted data')
        // check if data is array
        if (isObject(data) && 'stream' in data) {
            return 'stream'
        } else if (Array.isArray(data)) {
            return await serializeResponse(data)
        } else if (data) {
            // get plain version object
            // value.constructor returns the constructor of a specific object.
            // This allows the call of the correct ClassConstructor in plainToInstance()

            return data
            // return plainToInstance(data.constructor, data)
        }
    }
}
