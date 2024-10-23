import {Module} from '@nestjs/common'
import {SystemContactService} from '~/api/systemcontacts/system-contact.service'
import {SystemContactController} from '~/api/systemcontacts/system-contact.controller'
import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'
import {ContactModule} from '~/api/contacts/contact.module'
import {ContactMariadbRepository} from '~/api/contacts/repositories/contact.mariadb.repository'

@Module({
    imports: [JournalModule, ExpandModule, ContactModule],
    providers: [SystemContactService, ContactMariadbRepository],
    controllers: [SystemContactController],
})
export class SystemContactModule {
}
