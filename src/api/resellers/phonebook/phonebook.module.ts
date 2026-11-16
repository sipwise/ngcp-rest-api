import {Module} from '@nestjs/common'

import {ResellerPhonebookController} from './phonebook.controller'
import {ResellerPhonebookService} from './phonebook.service'
import {ResellerPhonebookMariadbRepository} from './repositories/phonebook.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'

@Module({
    imports: [
        JournalModule,
    ],
    controllers: [ResellerPhonebookController],
    providers: [ResellerPhonebookService, ResellerPhonebookMariadbRepository],
})
export class ResellerPhonebookModule {
}
