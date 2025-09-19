import {Module,forwardRef} from '@nestjs/common'

import {ClearCallCounterController} from './clear-call-counter.controller'
import {ClearCallCounterService} from './clear-call-counter.service'
import {ClearCallCounterRedisRepository} from './repositories/clear-call-counter.redis.repository'

import {TaskAgentModule} from '~/helpers/task-agent.module'

@Module({
    imports: [
        forwardRef(() => TaskAgentModule),
    ],
    providers: [ClearCallCounterService, ClearCallCounterRedisRepository],
    controllers: [ClearCallCounterController],
    exports: [ClearCallCounterService],
})
export class ClearCallCounterModule {
}