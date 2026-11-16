import {Module} from '@nestjs/common'

import {CustomerSpeedDialController} from './customer-speed-dial.controller'
import {CustomerSpeedDialService} from './customer-speed-dial.service'
import {CustomerSpeedDialMariadbRepository} from './repositories/customer-speed-dial.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'

@Module({
    imports: [
        JournalModule,
    ],
    controllers: [CustomerSpeedDialController],
    providers: [CustomerSpeedDialService, CustomerSpeedDialMariadbRepository],
})
export class CustomerSpeedDialModule {
}
