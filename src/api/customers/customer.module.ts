import {Module} from '@nestjs/common'
import {CustomerService} from '~/api/customers/customer.service'
import {CustomerController} from '~/api/customers/customer.controller'
import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'
import {CustomerMariadbRepository} from '~/api/customers/repositories/customer.mariadb.repository'
import {ContactMariadbRepository} from '~/api/contacts/repositories/contact.mariadb.repository'

@Module({
    imports: [JournalModule, ExpandModule],
    providers: [CustomerService, CustomerMariadbRepository, ContactMariadbRepository],
    controllers: [CustomerController],
})
export class CustomerModule {
}
