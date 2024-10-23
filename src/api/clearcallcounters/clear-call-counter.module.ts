import {Module} from '@nestjs/common'
import {ClearCallCounterService} from '~/api/clearcallcounters/clear-call-counter.service'
import {ClearCallCounterController} from '~/api/clearcallcounters/clear-call-counter.controller'
import {ClearCallCounterRedisRepository} from '~/api/clearcallcounters/repositories/clear-call-counter.redis.repository'

@Module({
    providers: [ClearCallCounterService, ClearCallCounterRedisRepository],
    controllers: [ClearCallCounterController],
    exports: [ClearCallCounterService],
})
export class ClearCallCounterModule {
}