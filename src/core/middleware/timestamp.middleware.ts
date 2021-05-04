import {Injectable, NestMiddleware} from "@nestjs/common";
import {NextFunction, Response} from "express";

/**
 * `TimestampMiddleware` adds the timestamp when a request was received to the request object `Context`
 */
@Injectable()
export class TimestampMiddleware implements NestMiddleware {
    use(req: any, res: Response, next: NextFunction): any {
        req.ctx.startTimestamp = Date.now();
        next();
    }
}
