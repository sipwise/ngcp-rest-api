import {Module, forwardRef} from '@nestjs/common'

import {SubscriberMariadbRepository} from './repositories/subscriber.mariadb.repository'
import {SubscriberRedisRepository} from './repositories/subscriber.redis.repository'
import {SubscriberController} from './subscriber.controller'
import {SubscriberService} from './subscriber.service'

import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'
import {TaskAgentModule} from '~/helpers/task-agent.module'

@Module({
    imports: [
        forwardRef(() => JournalModule),
        forwardRef(() => ExpandModule),
        TaskAgentModule,
    ],
    providers: [SubscriberService, SubscriberMariadbRepository, SubscriberRedisRepository],
    controllers: [SubscriberController],
    exports: [SubscriberService],
})
export class SubscriberModule {
}
