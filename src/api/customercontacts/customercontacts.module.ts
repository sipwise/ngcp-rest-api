import {forwardRef, Module} from '@nestjs/common'
import {CustomercontactsService} from './customercontacts.service'
import {CustomercontactsController} from './customercontacts.controller'
import {JournalsModule} from '../journals/journals.module'
import {ExpandModule} from '../../helpers/expand.module'
import {ContactsModule} from '../contacts/contacts.module'
import {ContactsMariadbRepository} from '../contacts/repositories/contacts.mariadb.repository'

@Module({
    imports: [
        JournalsModule,
        forwardRef(() => ExpandModule),
        ContactsModule
    ],
    controllers: [CustomercontactsController],
    providers: [
        CustomercontactsService,
        CustomercontactsController,
        ContactsMariadbRepository,
    ],
    exports: [
        CustomercontactsController,
        CustomercontactsService,
    ],
})
export class CustomercontactsModule {
}
