import {Module} from '@nestjs/common'

import {AuthPasswordChangeController} from './password-change.controller'
import {AuthPasswordChangeService} from './password-change.service'
import {AdminPasswordJournalMariadbRepository} from './repositories/admin-password-journal.mariadb.repository'
import {SubscriberPasswordJournalMariadbRepository} from './repositories/subscriber-password-journal.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'

@Module({
    imports: [JournalModule],
    controllers: [AuthPasswordChangeController],
    providers: [AuthPasswordChangeService, AdminPasswordJournalMariadbRepository, SubscriberPasswordJournalMariadbRepository],
})
export class AuthPasswordChangeModule {
}
