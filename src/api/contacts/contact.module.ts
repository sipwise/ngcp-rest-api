import {Module,forwardRef} from '@nestjs/common'

import {ContactController} from './contact.controller'
import {ContactService} from './contact.service'
import {ContactMariadbRepository} from './repositories/contact.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'

@Module({

    imports: [
        forwardRef(() => JournalModule),
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
