import {Module} from '@nestjs/common'
import {CustomerService} from './customer.service'
import {CustomerController} from './customer.controller'
import {JournalModule} from '../journals/journal.module'
import {ExpandModule} from '../../helpers/expand.module'
import {CustomerMariadbRepository} from './repositories/customer.mariadb.repository'
import {ContactMariadbRepository} from '../contacts/repositories/contact.mariadb.repository'

@Module({
    imports: [JournalModule, ExpandModule],
    providers: [CustomerService, CustomerMariadbRepository, ContactMariadbRepository],
    controllers: [CustomerController],
})
export class CustomerModule {
}
