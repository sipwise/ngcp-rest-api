import {Module} from '@nestjs/common'

import {CustomerController} from './customer.controller'
import {CustomerService} from './customer.service'
import {CustomerMariadbRepository} from './repositories/customer.mariadb.repository'

import {ContactMariadbRepository} from '~/api/contacts/repositories/contact.mariadb.repository'
import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'

@Module({
    imports: [JournalModule, ExpandModule],
    providers: [CustomerService, CustomerMariadbRepository, ContactMariadbRepository],
    controllers: [CustomerController],
})
export class CustomerModule {
}
