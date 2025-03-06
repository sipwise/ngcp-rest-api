import {Module} from '@nestjs/common'

import {SubscriberController} from './subscriber.controller'

@Module({
    controllers: [SubscriberController],
})
export class SubscriberModule {
}
