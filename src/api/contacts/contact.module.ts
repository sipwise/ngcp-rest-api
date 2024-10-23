import {forwardRef, Module} from '@nestjs/common'
import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'
import {ContactMariadbRepository} from '~/api/contacts/repositories/contact.mariadb.repository'
import {ContactController} from '~/api/contacts/contact.controller'
import {ContactService} from '~/api/contacts/contact.service'

@Module({

    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
    ],
    controllers: [ContactController],
    providers: [
        ContactService,
        ContactController,
        ContactMariadbRepository,
    ],
    exports: [
        ContactService,
        ContactController,
    ],
})
export class ContactModule {
}
