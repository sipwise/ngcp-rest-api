import {Module} from '@nestjs/common'
import {CustomersService} from './customers.service'
import {CustomersController} from './customers.controller'
import {JournalsModule} from '../journals/journals.module'

@Module({
    imports: [JournalsModule],
    providers: [CustomersService],
    controllers: [CustomersController],
})
export class CustomersModule {
}
