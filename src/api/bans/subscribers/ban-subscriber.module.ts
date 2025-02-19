import {Module,forwardRef} from '@nestjs/common'

import {BanSubscriberController} from './ban-subscriber.controller'
import {BanSubscriberService} from './ban-subscriber.service'
import {BanSubscriberMariadbRepository} from './repositories/ban-subscriber.mariadb.repository'

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
