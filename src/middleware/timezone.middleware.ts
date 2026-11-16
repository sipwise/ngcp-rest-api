import {Injectable, NestMiddleware} from '@nestjs/common'
import {NextFunction, Request, Response} from 'express'

import Context from '~/helpers/context.helper'
import {runWithRequestTimezone} from '~/helpers/date-time-input.helper'
import {RequestTimezone, TZ_PARAM, parseTimezoneParam} from '~/helpers/timezone.helper'

/**
 * Validates the tz query parameter of every route (400 for an invalid one) and binds the request's
 * timezone context (also as the async context of the rest of the request)
 */
@Injectable()
export class TimezoneMiddleware implements NestMiddleware {
    use(req: Request, _res: Response, next: NextFunction): void {
        try {
            const timezone = new RequestTimezone(req, parseTimezoneParam(req.query[TZ_PARAM]))
            const ctx = Context.get(req)
            if (ctx)
                ctx.timezone = timezone
            runWithRequestTimezone(timezone, next)
        } catch (err) {
            next(err)
        }
    }
}
