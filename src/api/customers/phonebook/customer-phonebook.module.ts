import {Module,forwardRef} from '@nestjs/common'

import {CustomerPhonebookController} from './customer-phonebook.controller'
import {CustomerPhonebookService} from './customer-phonebook.service'
import {CustomerPhonebookMariadbRepository} from './repositories/customer-phonebook.mariadb.repository'

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
