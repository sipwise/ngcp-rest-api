import {Module} from '@nestjs/common'

import {CustomerPhonebookController} from './phonebook.controller'
import {CustomerPhonebookService} from './phonebook.service'
import {CustomerPhonebookMariadbRepository} from './repositories/phonebook.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'

@Module({
    imports: [
        JournalModule,
    ],
    controllers: [CustomerPhonebookController],
    providers: [CustomerPhonebookService, CustomerPhonebookMariadbRepository],
})
export class CustomerPhonebookModule {
}
