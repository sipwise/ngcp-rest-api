import {Injectable, NestMiddleware} from '@nestjs/common'
import {NextFunction, Request, Response} from 'express'

import Context from '~/helpers/context.helper'

/**
 * ContextMiddleware that adds Context interface to the request object
 */
@Injectable()
export class ContextMiddleware implements NestMiddleware {
    use(req: Request, _res: Response, next: NextFunction): void {
        Context.bind(req)
        next()
    }
}
