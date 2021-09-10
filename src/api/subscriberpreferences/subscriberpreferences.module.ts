import {Module} from '@nestjs/common'
import {SubscriberpreferencesService} from './subscriberpreferences.service'
import {SubscriberpreferencesController} from './subscriberpreferences.controller'
import {JournalsModule} from '../journals/journals.module'

@Module({
    imports: [JournalsModule],
    providers: [SubscriberpreferencesService],
    controllers: [SubscriberpreferencesController],
})
export class SubscriberpreferencesModule {
}
