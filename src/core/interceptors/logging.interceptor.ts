import {CallHandler, ExecutionContext, Inject, NestInterceptor} from "@nestjs/common";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";
import {extractResourceName} from "./utils/interceptor.utils";
import {LoggingService} from "../../modules/logging/logging.service";
import {plainToClass} from "class-transformer";

/**
 * LoggingInterceptor intercepts requests and writes relevant information to log.
 */
export class LoggingInterceptor implements NestInterceptor {

    /**
     * Creates a new `LoggingInterceptor`
     * @param logger LoggingService
     */
    constructor(
        @Inject("LOGGING_SERVICE") private readonly logger: LoggingService
    ) {
    }

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
                let httpCtx = context.switchToHttp();
                const req = httpCtx.getRequest()

                // Set content format and default to json
                let contentType = req.get("Content-Type");
                if (contentType === undefined) {
                    contentType = "application/json";
                }

                const resourceName = extractResourceName(req.path, process.env.API_PREFIX)
                // console.log("Resource name: ", resourceName);

                // Get resourceID from data values if method is POST else from request params 'id'
                let resourceID;
                data = await data;

                // Get redacted version of response data
                let redacted: any = this.getRedactedPlain(data);
                if (req.method == "POST") {
                    resourceID = data.dataValues.id;
                } else {
                    resourceID = req.params.id;
                }
                // console.log("Resource ID: ", resourceID);

                // console.log("Timestamp: ", req.ctx.startTimestamp);
                // console.log("User: ", req.user.login);
                // console.log("Content Format: ", 'json');
                const logEntry = {
                    "resource_id": resourceID,
                    "resource_name": resourceName,
                    "content_type": contentType,
                    "tx_id": req.ctx.txId,
                    "received_at": req.ctx.startTimestamp,
                    "response_at": Date.now(),
                    "method": req.method,
                    "user": req.user.login,
                    "response": redacted,
                }
                this.logger.log(logEntry, "")
                return data;
            })
        );
    }

    /**
     * Returns redacted response data as single plain object or array of plain objects
     * @param data Object or array of objects
     * @private
     */
    private getRedactedPlain(data: any): any {
        // check if data is array
        if (Array.isArray(data)) {
            let redactedArr = [];
            // get plain version of stored object in array
            // value.constructor returns the constructor of a specific object.
            // This allows the call of the correct ClassConstructor in plainToClass()
            data.forEach(function (value) {
                let redacted: any = plainToClass(value.constructor, value.get({plain: true}));
                redactedArr.push(redacted.get({plain: true}))
            })
            return redactedArr;
        } else {
            // get plain version object
            // value.constructor returns the constructor of a specific object.
            // This allows the call of the correct ClassConstructor in plainToClass()
            let redacted: any = plainToClass(data.constructor, data.get({plain: true}));
            return redacted.get({plain: true});
        }
    }
}
