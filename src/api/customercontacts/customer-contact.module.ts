import {forwardRef, Module} from '@nestjs/common'
import {CustomerContactService} from './customer-contact.service'
import {CustomerContactController} from './customer-contact.controller'
import {JournalModule} from '../journals/journal.module'
import {ExpandModule} from '../../helpers/expand.module'
import {ContactModule} from '../contacts/contact.module'
import {ContactMariadbRepository} from '../contacts/repositories/contact.mariadb.repository'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
        ContactModule
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
