import {Module,forwardRef} from '@nestjs/common'

import {JournalController} from './journal.controller'
import {JournalService} from './journal.service'
import {JournalMariadbRepository} from './repositories/journal.mariadb.repository'

import {ExpandModule} from '~/helpers/expand.module'

@Module({
    controllers: [JournalController],
    imports: [
        //LoggingModule
        forwardRef(() => ExpandModule),
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
