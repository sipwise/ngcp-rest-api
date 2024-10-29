import {Injectable, NestMiddleware, ServiceUnavailableException} from '@nestjs/common'
import {NextFunction, Request, Response} from 'express'

import {AppService} from '~/app.service'

@Injectable()
export class StateMiddleware implements NestMiddleware {
    constructor(
        private readonly app: AppService,
    ) {
    }

    use(_req: Request, _res: Response, next: NextFunction): any {
        next(this.app.isDbInitialised && this.app.isDbAvailable && this.app.isRedisAvailable
            ? null
            : new ServiceUnavailableException(),
        )
    }
}
