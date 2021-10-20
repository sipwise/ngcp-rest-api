import {Injectable, NestMiddleware} from '@nestjs/common'
import {NextFunction, Response} from 'express'
import Context from '../helpers/context.helper'

/**
 * ContextMiddleware that adds Context interface to the request object
 */
@Injectable()
export class ContextMiddleware implements NestMiddleware {
    use(req: any, res: Response, next: NextFunction): any {
        Context.bind(req)
        next()
    }
}
