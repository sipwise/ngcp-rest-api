import {Module,forwardRef} from '@nestjs/common'

import {SubscriberPhonebookMariadbRepository} from './repositories/subscriber-phonebook.mariadb.repository'
import {SubscriberPhonebookController} from './subscriber-phonebook.controller'
import {SubscriberPhonebookService} from './subscriber-phonebook.service'

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
