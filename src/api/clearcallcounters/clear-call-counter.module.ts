import {Module} from '@nestjs/common'

import {ClearCallCounterController} from './clear-call-counter.controller'
import {ClearCallCounterService} from './clear-call-counter.service'
import {ClearCallCounterRedisRepository} from './repositories/clear-call-counter.redis.repository'

@Module({
    providers: [ClearCallCounterService, ClearCallCounterRedisRepository],
    controllers: [ClearCallCounterController],
    exports: [ClearCallCounterService],
})
export class ClearCallCounterModule {
}