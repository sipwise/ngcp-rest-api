import {Module} from '@nestjs/common'

import {BanSubscriberMariadbRepository} from './repositories/subscriber.mariadb.repository'
import {BanSubscriberController} from './subscriber.controller'
import {BanSubscriberService} from './subscriber.service'

import {JournalModule} from '~/api/journals/journal.module'

@Module({
    imports: [
        JournalModule,
    ],
    providers: [BanSubscriberService, BanSubscriberMariadbRepository],
    controllers: [BanSubscriberController],
})
export class BanSubscriberModule {
}
