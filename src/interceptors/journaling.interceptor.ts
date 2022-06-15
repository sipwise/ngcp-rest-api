import {CallHandler, ExecutionContext, forwardRef, Inject, NestInterceptor} from '@nestjs/common'
import {Observable} from 'rxjs'
import {map} from 'rxjs/operators'
import {JournalsService} from '../api/journals/journals.service'
import {extractResourceName} from '../helpers/uri.helper'
import {AppService} from '../app.service'
import Context from '../helpers/context.helper'
import {isObject} from 'class-validator'
import {internal} from '../entities'
import {obfuscatePasswordJSON} from '../helpers/password-obfuscator.helper'

/**
 * Lookup-table for HTTP operations
 */
const operation = {
    'PATCH': 'update',
    'POST': 'create',
    'PUT': 'update',
    'DELETE': 'delete',
}

/**
 * Lookup-table for Content-Type
 */
const contentFormat = {
    'application/json': 'json',
}

/**
 * JournalInterceptor writes journal entries for POST, PUT and DELETE requests to the database.
 */
export class JournalingInterceptor implements NestInterceptor {

    /**
     * Creates a new `JournalingInterceptor`
     * @param journalsService Injected JournalService to access database
     */
    constructor(
        @Inject(forwardRef(() => JournalsService))
        private readonly journalsService: JournalsService,
    ) {
    }

    /**
     * Creates a journal entry containing the received Content-Type, HTTP method, username, timestamp, resource name
     * resource ID and encoded received data to database
     *
     * Journal entries are only created for HTTP methods POST, PUT and DELETE.
     * On other methods the function simply returns
     *
     * It does not modify received data and always returns it as is.
     *
     * Currently the only supported Content-Type is `application/json`.
     *
     * @param context ExecutionContext to access HTTP request
     * @param next  Next CallHandler
     *
     * @returns data unmodified as received
     */
    intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
        return next.handle().pipe(
            map(data => {
                const httpCtx = context.switchToHttp()
                const req = httpCtx.getRequest()

                // Set content format and default to json
                let cf = contentFormat[req.get('Content-Type')]
                if (cf === undefined) {
                    cf = 'json'
                }

                // skip journaling if request method is not POST, PUT or DELETE
                const op = operation[req.method]
                if (op === undefined) {
                    return data
                }

                const resourceName = extractResourceName(req.path, AppService.config.common.api_prefix)

                // Get resourceID from data values if method is POST else from request params 'id'
                let resourceID = 0
                if (req.method == 'POST') {
                    if (data && 'id' in data && data.id && Number.isInteger(data.id))
                        resourceID = data.id
                } else {
                    resourceID = req.params.id
                }

                const ctx = Context.get(req)

                // create new Journal entry
                const entry = internal.Journal.create({
                    reseller_id: req.user.reseller_id,
                    role_id: req.user.role_data ? req.user.role_data.id : null,
                    role: req.user.role,
                    user_id: req.user.id,
                    tx_id: ctx.txid,
                    content: Object.keys(req.body).length > 0
                        ? isObject(req.body) || Array.isArray(req.body)
                            ? JSON.stringify(req.body, obfuscatePasswordJSON)
                            : Buffer.from(req.body)
                        : '',
                    content_format: cf,
                    operation: op,
                    resource_id: resourceID,
                    resource_name: resourceName,
                    timestamp: ctx.startTime / 1000,
                    username: req['user'] !== undefined ? req.user.username : '',
                })

                // write Journal entry to database
                this.journalsService.create(entry)
                return data
            }),
        )
    }
}
