import {Injectable, Logger, NestMiddleware} from '@nestjs/common'
import {NextFunction, Request, Response} from 'express'

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    private readonly log = new Logger(LoggerMiddleware.name)

    use(req: Request, res: Response, next: NextFunction): any {
        const logEntry = {
            message: 'request',
            uri: req.baseUrl,
            content_type: req.header('content-type'),
            // tx_id: req.ctx.txId,
            received_at: Date.now(),
            method: req.method,
            body: req.body,

        }
        this.log.log(logEntry)
        next()
    }
}

