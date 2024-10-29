import {Module,forwardRef} from '@nestjs/common'

import {CustomerContactController} from './customer-contact.controller'
import {CustomerContactService} from './customer-contact.service'

import {ContactModule} from '~/api/contacts/contact.module'
import {ContactMariadbRepository} from '~/api/contacts/repositories/contact.mariadb.repository'
import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'

@Module({
    imports: [
        forwardRef(() => JournalModule),
        forwardRef(() => ExpandModule),
        forwardRef(() => ContactModule),
    ],
    controllers: [CustomerContactController],
    providers: [
        CustomerContactService,
        CustomerContactController,
        ContactMariadbRepository,
    ],
    exports: [
        CustomerContactController,
        CustomerContactService,
    ],
})
export class CustomerContactModule {
}
