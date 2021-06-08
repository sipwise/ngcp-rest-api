import {Injectable, NestMiddleware} from '@nestjs/common'
import {NextFunction, Response} from 'express'
import {v4 as uuidv4} from 'uuid'

/**
 * `TxIDMiddleware` adds a unique uuidv4 transaction id to a received request object `Context`
 */
@Injectable()
export class TxIDMiddleware implements NestMiddleware {
    use(req: any, res: Response, next: NextFunction): any {
        req.ctx.txId = uuidv4()
        next()
    }
}
