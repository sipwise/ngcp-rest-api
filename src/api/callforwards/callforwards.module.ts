import {Module} from '@nestjs/common'
import {CallforwardsService} from './callforwards.service'
import {CallforwardsController} from './callforwards.controller'
import {JournalsModule} from '../journals/journals.module'

@Module({
    imports: [JournalsModule],
    providers: [CallforwardsService],
    controllers: [CallforwardsController],
})
export class CallforwardsModule {
}
