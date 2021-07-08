import {CallHandler, ExecutionContext, Inject, NestInterceptor} from '@nestjs/common'
import {Observable} from 'rxjs'
import {map} from 'rxjs/operators'
import {extractResourceName} from '../helpers/uri.helper'
import {JournalsService} from '../api/journals/journals.service'
import {JournalCreateDto} from '../api/journals/dto/journal-create.dto'
import {TextEncoder} from 'util'
import {config} from '../config/main.config'

/**
 * Lookup-table for HTTP operations
 */
const operation = {
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
     * @param journalService Injected JournalService to access database
     */
    constructor(@Inject('JOURNAL_SERVICE') private readonly journalsService: JournalsService) {
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
            map(async data => {
                // TODO: only log to console when executed in Debug mode
                let httpCtx = context.switchToHttp()
                const req = httpCtx.getRequest()

                // Set content format and default to json
                let cf = contentFormat[req.get('Content-Type')]
                if (cf === undefined) {
                    cf = 'json'
                }

                // skip journaling if request method is not POST, PUT or DELETE
                let op = operation[req.method]
                if (op === undefined) {
                    return data
                }

                const resourceName = extractResourceName(req.path, config.common.api_prefix)

                // Get resourceID from data values if method is POST else from request params 'id'
                let resourceID
                if (req.method == 'POST') {
                    resourceID = data.id
                } else {
                    resourceID = req.params.id
                }

                const enc = new TextEncoder()

                // create new Journal entry
                const entry: JournalCreateDto = {
                    content: enc.encode(JSON.stringify(req.body)),
                    content_format: cf,
                    operation: op,
                    resource_id: resourceID,
                    resource_name: resourceName,
                    timestamp: req.ctx.startTimestamp / 1000,
                    username: req.user.login,
                }


                // write Journal entry to database
                await this.journalsService.create(entry)
                return data
            }),
        )
    }

}
