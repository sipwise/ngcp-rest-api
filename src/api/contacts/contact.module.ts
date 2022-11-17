import {forwardRef, Module} from '@nestjs/common'
import {JournalModule} from '../journals/journal.module'
import {ExpandModule} from '../../helpers/expand.module'
import {ContactMariadbRepository} from './repositories/contact.mariadb.repository'
import {ContactController} from './contact.controller'
import {ContactService} from './contact.service'

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
