import {forwardRef, Module} from '@nestjs/common'
import {JournalsModule} from '../journals/journals.module'
import {ExpandModule} from '../../helpers/expand.module'
import {ContactsMariadbRepository} from './repositories/contacts.mariadb.repository'
import {ContactsController} from './contacts.controller'
import {ContactsService} from './contacts.service'

@Module({

    imports: [
        JournalsModule,
        forwardRef(() => ExpandModule),
    ],
    controllers: [ContactsController],
    providers: [
        ContactsService,
        ContactsController,
        ContactsMariadbRepository,
    ],
    exports: [
        ContactsService,
        ContactsController,
    ],
})
export class ContactsModule {
}
