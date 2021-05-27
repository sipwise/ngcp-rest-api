import {CallHandler, ExecutionContext, Inject, NestInterceptor} from "@nestjs/common";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";
import {extractResourceName} from "./utils/interceptor.utils";
import {JournalService} from "../../modules/journal/journal.service";
import {TextEncoder} from "util";
import {JournalCreateDto} from "../../modules/journal/dto/journal.create.dto";
import {config} from '../../config/main';

/**
 * Lookup-table for HTTP operations
 */
const operation = {
    "POST": "create",
    "PUT": "update",
    "DELETE": "delete",
}
/**
 * Lookup-table for Content-Type
 */
const contentFormat = {
    "application/json": "json",
}

/**
 * JournalInterceptor writes journal entries for POST, PUT and DELETE requests to the database.
 */
export class JournalingInterceptor implements NestInterceptor {

    /**
     * Creates a new `JournalingInterceptor`
     * @param journalService Injected JournalService to access database
     */
    constructor(@Inject("JOURNAL_SERVICE") private readonly journalService: JournalService) {
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
                let httpCtx = context.switchToHttp();
                const req = httpCtx.getRequest();

                // Set content format and default to json
                let cf = contentFormat[req.get("Content-Type")];
                if (cf === undefined) {
                    cf = "json";
                }

                // skip journaling if request method is not POST, PUT or DELETE
                let op = operation[req.method];
                if (op === undefined) {
                    // console.log("skipping journal on method", req.method)
                    return data;
                }
                // console.log("Operation: ", op);

                const resourceName = extractResourceName(req.path, config.common.api_prefix);
                // console.log("Resource name: ", resourceName);

                // Get resourceID from data values if method is POST else from request params 'id'
                let resourceID;
                if (req.method == "POST") {
                    resourceID = data.dataValues.id;
                } else {
                    resourceID = req.params.id;
                }
                // console.log("Resource ID: ", resourceID);

                // console.log("Timestamp: ", req.ctx.startTimestamp);
                // console.log("User: ", req.user.login);
                // console.log("Content Format: ", 'json');

                const enc = new TextEncoder();

                // create new Journal entry
                let j = new JournalCreateDto();
                j.content = enc.encode(JSON.stringify(req.body));
                j.content_format = cf;
                j.operation = op;
                j.resource_id = resourceID;
                j.resource_name = resourceName;
                j.timestamp = req.ctx.startTimestamp / 1000;
                j.username = req.user.dataValues.login;

                // write Journal entry to database
                await this.journalService.create(j);
                return data;
            })
        );
    }

}
