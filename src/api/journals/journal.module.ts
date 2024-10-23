import {forwardRef, Module} from '@nestjs/common'
import {JournalController} from '~/api/journals/journal.controller'
import {JournalService} from '~/api/journals/journal.service'
import {ExpandModule} from '~/helpers/expand.module'
import {JournalMariadbRepository} from '~/api/journals/repositories/journal.mariadb.repository'

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
