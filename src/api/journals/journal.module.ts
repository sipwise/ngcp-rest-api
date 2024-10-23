import {forwardRef, Module} from '@nestjs/common'
import {JournalController} from './journal.controller'
import {JournalService} from './journal.service'
import {ExpandModule} from '../../helpers/expand.module'
import {JournalMariadbRepository} from './repositories/journal.mariadb.repository'

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
