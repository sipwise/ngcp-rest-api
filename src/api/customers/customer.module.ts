import {Module} from '@nestjs/common'
import {CustomerService} from './customer.service'
import {CustomerController} from './customer.controller'
import {JournalModule} from '../journals/journal.module'
import {ExpandModule} from '../../helpers/expand.module'

@Module({
    imports: [JournalModule, ExpandModule],
    providers: [CustomerService],
    controllers: [CustomerController],
})
export class CustomersModule {
}
