import {Module} from '@nestjs/common'

import {TimeSetEventModule} from './events/event.module'
import {TimeSetMariadbRepository} from './repositories/time-set.mariadb.repository'
import {TimeSetController} from './time-set.controller'
import {TimeSetService} from './time-set.service'

import {JournalModule} from '~/api/journals/journal.module'

@Module({
    imports: [
        JournalModule,
        TimeSetEventModule,
    ],
    controllers: [TimeSetController],
    providers: [TimeSetService, TimeSetMariadbRepository],
})
export class TimeSetModule {
}
