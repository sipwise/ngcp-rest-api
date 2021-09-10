import {Module} from '@nestjs/common'
import {SubscribersService} from './subscribers.service'
import {SubscribersController} from './subscribers.controller'
import {JournalsModule} from '../journals/journals.module'

@Module({
    imports: [JournalsModule],
    providers: [SubscribersService],
    controllers: [SubscribersController],
})
export class SubscribersModule {
}
