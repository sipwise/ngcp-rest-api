import {Module} from '@nestjs/common'
import {CustomersService} from './customers.service'
import {CustomersController} from './customers.controller'
import {JournalsModule} from '../journals/journals.module'
import {ExpandModule} from '../../helpers/expand.module'

@Module({
    imports: [JournalsModule, ExpandModule],
    providers: [CustomersService],
    controllers: [CustomersController],
})
export class CustomersModule {
}
