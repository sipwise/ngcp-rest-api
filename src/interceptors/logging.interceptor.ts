import {CallHandler, ExecutionContext, NestInterceptor} from '@nestjs/common'
import {classToPlain} from 'class-transformer'
import {isObject} from 'class-validator'
import {Observable} from 'rxjs'
import {map} from 'rxjs/operators'

import Context from '~/helpers/context.helper'
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
            map(data => {
                // TODO: only log to console when executed in Debug mode
                const httpCtx = context.switchToHttp()
                const req = httpCtx.getRequest()

                // Get redacted version of response data
                const redacted: unknown = this.getRedactedPlain(data)

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
                    url: `${req.protocol}://${req.header('host')}${req.url}`,
                    query_params: req.query,
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
    private getRedactedPlain(data: unknown): unknown {
        this.log.debug('generating redacted data')
        // check if data is array
        if (isObject(data) && 'stream' in data) {
            return 'stream'
        } else if (Array.isArray(data)) {
            const redactedArr = []
            // get plain version of stored object in array
            // value.constructor returns the constructor of a specific object.
            // This allows the call of the correct ClassConstructor in plainToClass()
            data.forEach(function (value) {
                const plain = classToPlain(value)
                //    let redacted = plainToClass(value.constructor, plain)
                redactedArr.push(plain)
            })
            return redactedArr
        } else if (data) {
            // get plain version object
            // value.constructor returns the constructor of a specific object.
            // This allows the call of the correct ClassConstructor in plainToClass()

            return data
            // return plainToClass(data.constructor, data)
        }
    }
}
