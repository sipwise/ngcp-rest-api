import {Injectable, NestMiddleware} from '@nestjs/common'
import {NextFunction, Request, Response} from 'express'

import {InvalidParameterException} from '~/helpers/errors.helper'
import {readLimit} from '~/helpers/request-limits.helper'

/**
 * 400 for a GET whose `rows` exceed read_limit. Checked here, once per client request: internal subrequests
 * (expand) page with their own `rows` and don't pass the middleware.
 */
@Injectable()
export class ReadLimitMiddleware implements NestMiddleware {
    use(req: Request, _res: Response, next: NextFunction): void {
        const max = readLimit()
        if (req.method == 'GET' && +req.query.rows > max) {
            next(new InvalidParameterException([{parameter: 'rows', code: 'max', message: `rows must not be greater than ${max}`}]))
            return
        }
        next()
    }
}
