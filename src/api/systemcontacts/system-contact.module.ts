import {Module} from '@nestjs/common'

import {SystemContactController} from './system-contact.controller'
import {SystemContactService} from './system-contact.service'

import {ContactModule} from '~/api/contacts/contact.module'
import {ContactMariadbRepository} from '~/api/contacts/repositories/contact.mariadb.repository'
import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'

@Module({
    imports: [
        ContactModule,
        JournalModule,
        ExpandModule,
    ],
    providers: [SystemContactService, ContactMariadbRepository],
    controllers: [SystemContactController],
})
export class SystemContactModule {
}
