import {Module,forwardRef} from '@nestjs/common'

import {SubscriberPhonebookController} from './phonebook.controller'
import {SubscriberPhonebookService} from './phonebook.service'
import {SubscriberPhonebookMariadbRepository} from './repositories/phonebook.mariadb.repository'

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
