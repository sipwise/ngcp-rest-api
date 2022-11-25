import {Injectable, NestMiddleware} from '@nestjs/common'
import {NextFunction, Request, Response} from 'express'
import Context from '../helpers/context.helper'
import {obfuscatePasswordJSON} from '../helpers/password-obfuscator.helper'
import {LoggerService} from '../logger/logger.service'
import {deepCopy} from '../helpers/deep-copy.helper'

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    private readonly log = new LoggerService(LoggerMiddleware.name)

    use(req: Request, res: Response, next: NextFunction): any {
        const ctx = Context.get(req)
        let body = JSON.stringify(req.body, obfuscatePasswordJSON)

        /**
         * If the body is longer than 4096 characters, it is truncated to a length of 4096 and only the string
         * version of the body is written to logs.
         * If the body is shorter than 4096 characters it is converted back to an object and logged as one
         */
        if (body.length > 4096) {
            body = body.substr(0, 4096)
            const whitespaces = new RegExp('[\\s]+', 'g')
            const separators = new RegExp(',"', 'g')

            body = body.replace(whitespaces, ' ')
            body = body.replace(separators, ', "')
        } else {
            body = JSON.parse(body)
        }
        const headers = deepCopy(req.headers)

        if (headers['authorization'])
            delete headers['authorization']
        
        this.log.log({
            message: 'REQUEST',
            tx: ctx.txid,
            ip: req.ip,
            url: `${req.protocol}://${req.header('host')}${req.url}`,
            query_params: req.query,
            content_type: req.header('content-type'),
            method: req.method,
            received_at: ctx.startTime,
            headers: headers,
            body: body,
        })
        next()
    }
}
