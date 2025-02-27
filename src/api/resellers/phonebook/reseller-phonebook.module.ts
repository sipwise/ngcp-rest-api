import {Module,forwardRef} from '@nestjs/common'

import {ResellerPhonebookMariadbRepository} from './repositories/reseller-phonebook.mariadb.repository'
import {ResellerPhonebookController} from './reseller-phonebook.controller'
import {ResellerPhonebookService} from './reseller-phonebook.service'

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
