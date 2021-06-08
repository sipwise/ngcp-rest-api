import {Injectable, NestMiddleware} from '@nestjs/common'
import {NextFunction, Response} from 'express'
import {Context} from '../interfaces/context.interface'

/**
 * ContextMiddleware that adds Context interface to the request object
 */
@Injectable()
export class ContextMiddleware implements NestMiddleware {
    ctx: Context = {startTimestamp: 0, txId: ''}

    use(req: any, res: Response, next: NextFunction): any {
        req.ctx = this.ctx
        next()
    }
}
