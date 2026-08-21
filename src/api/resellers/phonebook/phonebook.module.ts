import {Module,forwardRef} from '@nestjs/common'

import {ResellerPhonebookMariadbRepository} from './repositories/phonebook.mariadb.repository'
import {ResellerPhonebookController} from './phonebook.controller'
import {ResellerPhonebookService} from './phonebook.service'

import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
    ],
    controllers: [ResellerPhonebookController],
    providers: [ResellerPhonebookService, ResellerPhonebookMariadbRepository],
})
export class ResellerPhonebookModule {
}
