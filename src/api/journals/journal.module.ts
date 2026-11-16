import {Module} from '@nestjs/common'

import {JournalController} from './journal.controller'
import {JournalService} from './journal.service'
import {JournalMariadbRepository} from './repositories/journal.mariadb.repository'


@Module({
    controllers: [JournalController],
    imports: [
        //LoggingModule
    ],
    providers: [
        JournalService,
        JournalMariadbRepository,
    ],
    exports: [
        JournalService,
        JournalMariadbRepository,
    ],
})
export class JournalModule {
}
