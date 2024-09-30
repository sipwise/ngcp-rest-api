import {Module} from '@nestjs/common'
import {PasswordChangeController} from './password-change.controller'
import {JournalModule} from '../../../../api/journals/journal.module'
import {PasswordChangeService} from './password-change.service'
import {AdminPasswordJournalMariadbRepository} from './repositories/admin-password-journal.mariadb.repository'
import {SubscriberPasswordJournalMariadbRepository} from './repositories/subscriber-password-journal.mariadb.repository'

@Module({
    imports: [JournalModule],
    controllers: [PasswordChangeController],
    providers: [PasswordChangeService, AdminPasswordJournalMariadbRepository, SubscriberPasswordJournalMariadbRepository],
})
export class PasswordChangeModule {
}
