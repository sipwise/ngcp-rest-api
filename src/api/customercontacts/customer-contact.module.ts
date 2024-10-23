import {forwardRef, Module} from '@nestjs/common'
import {CustomerContactService} from '~/api/customercontacts/customer-contact.service'
import {CustomerContactController} from '~/api/customercontacts/customer-contact.controller'
import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'
import {ContactModule} from '~/api/contacts/contact.module'
import {ContactMariadbRepository} from '~/api/contacts/repositories/contact.mariadb.repository'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
        ContactModule,
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
