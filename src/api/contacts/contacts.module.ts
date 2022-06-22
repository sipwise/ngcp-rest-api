import {forwardRef, Module} from '@nestjs/common'
import {JournalsModule} from '../journals/journals.module'
import {ExpandModule} from '../../helpers/expand.module'
import {ContactsMariadbRepository} from './repositories/contacts.mariadb.repository'

@Module({

    imports: [
        JournalsModule,
        forwardRef(() => ExpandModule),
    ],
    providers: [ContactsMariadbRepository],
})
export class ContactsModule {
}
