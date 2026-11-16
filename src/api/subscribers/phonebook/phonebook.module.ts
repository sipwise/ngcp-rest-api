import {Module} from '@nestjs/common'

import {SubscriberPhonebookController} from './phonebook.controller'
import {SubscriberPhonebookService} from './phonebook.service'
import {SubscriberPhonebookMariadbRepository} from './repositories/phonebook.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'

@Module({
    imports: [
        JournalModule,
    ],
    controllers: [SubscriberPhonebookController],
    providers: [SubscriberPhonebookService, SubscriberPhonebookMariadbRepository],
})
export class SubscriberPhonebookModule {
}
