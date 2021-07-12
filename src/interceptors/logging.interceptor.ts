import {CallHandler, ExecutionContext, Logger, NestInterceptor} from '@nestjs/common'
import {Observable} from 'rxjs'
import {map} from 'rxjs/operators'
import {extractResourceName} from '../helpers/uri.helper'
import {plainToClass} from 'class-transformer'
import {config} from '../config/main.config'

/**
 * LoggingInterceptor intercepts requests and writes relevant information to log.
 */
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(LoggingInterceptor.name)

    /**
     * Intercept implements the logging part for all HTTP requests
     *
     * @param context ExecutionContext to access HTTP request
     * @param next  Next CallHandler
     *
     * @returns data unmodified as received
     */
    intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
        return next.handle().pipe(
            map(async data => {
                // TODO: only log to console when executed in Debug mode
                let httpCtx = context.switchToHttp()
                const req = httpCtx.getRequest()

                // Set content format and default to json
                let contentType = req.get('Content-Type')
                if (contentType === undefined) {
                    contentType = 'application/json'
                }

                const resourceName = extractResourceName(req.path, config.common.api_prefix)

                // Get resourceID from data values if method is POST else from request params 'id'
                let resourceID
                data = await data

                // Get redacted version of response data
                let redacted: any = this.getRedactedPlain(data)
                if (req.method == 'POST') {
                    resourceID = data.id
                } else {
                    resourceID = req.params.id
                }

                const logEntry = {
                    'resource_id': resourceID,
                    'resource_name': resourceName,
                    'content_type': contentType,
                    'tx_id': req.ctx.txId,
                    'received_at': req.ctx.startTimestamp,
                    'response_at': Date.now(),
                    'method': req.method,
                    'response': redacted,
                }
                logEntry['username'] = req['user'] !== undefined ? req.user.username : 'unknown'
                this.logger.log(JSON.stringify(logEntry), LoggingInterceptor.name)
                return data
            }),
        )
    }

    /**
     * Returns redacted response data as single plain object or array of plain objects
     * @param data Object or array of objects
     * @private
     */
    private getRedactedPlain(data: any): any {
        // check if data is array
        if (Array.isArray(data)) {
            let redactedArr = []
            // get plain version of stored object in array
            // value.constructor returns the constructor of a specific object.
            // This allows the call of the correct ClassConstructor in plainToClass()
            data.forEach(function (value) {
                let redacted = plainToClass(value.constructor, value)
                redactedArr.push(redacted)
            })
            return redactedArr
        } else {
            // get plain version object
            // value.constructor returns the constructor of a specific object.
            // This allows the call of the correct ClassConstructor in plainToClass()
            let redacted = plainToClass(data.constructor, data)
            return redacted
        }
    }
}
