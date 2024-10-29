import {Module} from '@nestjs/common'

import {PasswordChangeController} from './password-change.controller'
import {PasswordChangeService} from './password-change.service'
import {AdminPasswordJournalMariadbRepository} from './repositories/admin-password-journal.mariadb.repository'
import {SubscriberPasswordJournalMariadbRepository} from './repositories/subscriber-password-journal.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'

@Module({
    imports: [JournalModule],
    controllers: [PasswordChangeController],
    providers: [PasswordChangeService, AdminPasswordJournalMariadbRepository, SubscriberPasswordJournalMariadbRepository],
})
export class PasswordChangeModule {
}
