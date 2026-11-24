import {Module} from '@nestjs/common'

import {TimeSetEventController} from './event.controller'
import {TimeSetEventService} from './event.service'
import {TimeSetEventMariadbRepository} from './repositories/event.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'
import {TimeSetMariadbRepository} from '~/api/time-sets/repositories/time-set.mariadb.repository'

@Module({
    imports: [
        JournalModule,
    ],
    controllers: [TimeSetEventController],
    providers: [TimeSetEventService, TimeSetEventMariadbRepository, TimeSetMariadbRepository],
    exports: [TimeSetEventService],
})
export class TimeSetEventModule {
}
