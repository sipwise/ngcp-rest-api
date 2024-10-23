import {Module} from '@nestjs/common'
import {PasswordChangeController} from '~/api/auth/password/change/password-change.controller'
import {JournalModule} from '~/api/journals/journal.module'
import {PasswordChangeService} from '~/api/auth/password/change/password-change.service'
import {AdminPasswordJournalMariadbRepository} from '~/api/auth/password/change/repositories/admin-password-journal.mariadb.repository'
import {SubscriberPasswordJournalMariadbRepository} from '~/api/auth/password/change/repositories/subscriber-password-journal.mariadb.repository'

@Module({
    imports: [JournalModule],
    controllers: [PasswordChangeController],
    providers: [PasswordChangeService, AdminPasswordJournalMariadbRepository, SubscriberPasswordJournalMariadbRepository],
})
export class PasswordChangeModule {
}
