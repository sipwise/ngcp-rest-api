import {Module,forwardRef} from '@nestjs/common'

import {BanSubscriberMariadbRepository} from './repositories/subscriber.mariadb.repository'
import {BanSubscriberController} from './subscriber.controller'
import {BanSubscriberService} from './subscriber.service'

import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
    ],
    providers: [BanSubscriberService, BanSubscriberMariadbRepository],
    controllers: [BanSubscriberController],
})
export class BanSubscriberModule {
}
