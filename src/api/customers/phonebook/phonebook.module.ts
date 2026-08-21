import {Module,forwardRef} from '@nestjs/common'

import {CustomerPhonebookController} from './phonebook.controller'
import {CustomerPhonebookService} from './phonebook.service'
import {CustomerPhonebookMariadbRepository} from './repositories/phonebook.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
    ],
    controllers: [CustomerPhonebookController],
    providers: [CustomerPhonebookService, CustomerPhonebookMariadbRepository],
})
export class CustomerPhonebookModule {
}
