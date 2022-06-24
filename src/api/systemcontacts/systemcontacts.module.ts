import {Module} from '@nestjs/common'
import {SystemcontactsService} from './systemcontacts.service'
import {SystemcontactsController} from './systemcontacts.controller'
import {JournalsModule} from '../journals/journals.module'
import {ExpandModule} from '../../helpers/expand.module'
import {ContactsModule} from '../contacts/contacts.module'
import {ContactsMariadbRepository} from '../contacts/repositories/contacts.mariadb.repository'

@Module({
    imports: [JournalsModule, ExpandModule, ContactsModule],
    providers: [SystemcontactsService, ContactsMariadbRepository],
    controllers: [SystemcontactsController],
})
export class SystemcontactsModule {
}
