import {HttpException, HttpStatus, Injectable, NestMiddleware} from '@nestjs/common'
import bodyParser from 'body-parser'
import {NextFunction, Request, Response} from 'express'

function hasRequestBody(req: Request): boolean {
    const contentLength = req.headers['content-length']
    return req.headers['transfer-encoding'] === 'chunked' || (!!contentLength && contentLength !== '0')
}

/**
 * If a request has no Content-Type header but does carry a body, we still try to parse it as
 * JSON on the client's behalf (rather than silently leaving `req.body` empty). If that body
 * turns out not to be valid JSON, reject with a 415 explaining the assumption - instead of
 * failing later with a confusing validation error about missing fields.
 */
@Injectable()
export class ContentTypeMiddleware implements NestMiddleware {
    private readonly parseJson = bodyParser.json({type: () => true})

    use(req: Request, res: Response, next: NextFunction): void {
        if (req.headers['content-type'] || !hasRequestBody(req)) {
            next()
            return
        }

        this.parseJson(req, res, (err) => {
            if (err) {
                next(new HttpException({
                    error: 'Unsupported Media Type',
                    message: `No Content-Type header was provided, so 'application/json' was assumed, but the request body is not valid JSON: ${err.message}`,
                }, HttpStatus.UNSUPPORTED_MEDIA_TYPE))
                return
            }
            next()
        })
    }
}
