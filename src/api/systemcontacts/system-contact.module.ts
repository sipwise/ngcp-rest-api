import {Module} from '@nestjs/common'
import {SystemContactService} from './system-contact.service'
import {SystemContactController} from './system-contact.controller'
import {JournalModule} from '../journals/journal.module'
import {ExpandModule} from '../../helpers/expand.module'
import {ContactModule} from '../contacts/contact.module'
import {ContactMariadbRepository} from '../contacts/repositories/contact.mariadb.repository'

@Module({
    imports: [JournalModule, ExpandModule, ContactModule],
    providers: [SystemContactService, ContactMariadbRepository],
    controllers: [SystemContactController],
})
export class SystemContactModule {
}
