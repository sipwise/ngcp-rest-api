import {Injectable, Logger, NestMiddleware, ServiceUnavailableException} from '@nestjs/common'
import {NextFunction, Request, Response} from 'express'
import {AppService} from '../app.service'
import Context from '../helpers/context.helper'

@Injectable()
export class StateMiddleware implements NestMiddleware {
    constructor(
        private readonly app: AppService,
    ) {
    }

    use(req: Request, res: Response, next: NextFunction): any {
        next(this.app.isDbInitialised && this.app.isDbAvailable
                ? null
                : new ServiceUnavailableException()
        )
    }
}