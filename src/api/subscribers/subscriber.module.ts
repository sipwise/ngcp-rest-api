import {Module, forwardRef} from '@nestjs/common'

import {SubscriberMariadbRepository} from './repositories/subscriber.mariadb.repository'
import {SubscriberController} from './subscriber.controller'
import {SubscriberService} from './subscriber.service'

import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'

@Module({
    imports: [
        forwardRef(() => JournalModule),
        forwardRef(() => ExpandModule),
    ],
    providers: [SubscriberService, SubscriberMariadbRepository],
    controllers: [SubscriberController],
    exports: [SubscriberService],
})
export class SubscriberModule {
}
