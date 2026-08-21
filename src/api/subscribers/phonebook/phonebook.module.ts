import {Module,forwardRef} from '@nestjs/common'

import {SubscriberPhonebookMariadbRepository} from './repositories/phonebook.mariadb.repository'
import {SubscriberPhonebookController} from './phonebook.controller'
import {SubscriberPhonebookService} from './phonebook.service'

import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
    ],
    controllers: [SubscriberPhonebookController],
    providers: [SubscriberPhonebookService, SubscriberPhonebookMariadbRepository],
})
export class SubscriberPhonebookModule {
}
