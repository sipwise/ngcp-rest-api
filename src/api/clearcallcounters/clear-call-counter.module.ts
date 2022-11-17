import {Module} from '@nestjs/common'
import {ClearCallCounterService} from './clear-call-counter.service'
import {ClearCallCounterController} from './clear-call-counter.controller'

@Module({
    providers: [ClearCallCounterService],
    controllers: [ClearCallCounterController],
    exports: [ClearCallCounterService],
})
export class ClearCallCounterModule {
}