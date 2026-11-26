import {Injectable, NestMiddleware} from '@nestjs/common'
import {NextFunction, Request, Response} from 'express'

import {InvalidParameterException} from '~/helpers/errors.helper'
import {readRowsLimit} from '~/helpers/request-limits.helper'

/**
 * 400 for a GET whose `rows` exceed read_rows_limit. Checked here, once per client request: internal subrequests
 * (expand) page with their own `rows` and don't pass the middleware. CSV exports ignore rows, read_file_limit
 * bounds them.
 */
@Injectable()
export class ReadLimitMiddleware implements NestMiddleware {
    use(req: Request, _res: Response, next: NextFunction): void {
        const max = readRowsLimit()
        if (req.method == 'GET' && req.headers.accept !== 'text/csv' && +req.query.rows > max) {
            next(new InvalidParameterException([{parameter: 'rows', code: 'max', message: `rows must not be greater than ${max}`}]))
            return
        }
        next()
    }
}
