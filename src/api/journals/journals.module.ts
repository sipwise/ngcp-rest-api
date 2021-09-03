import {Module} from '@nestjs/common'
import {JournalsController} from './journals.controller'
import {JournalsService} from './journals.service'

@Module({
    controllers: [JournalsController],
    imports: [
        //LoggingModule
    ],
    providers: [
        JournalsService,
    ],
    exports: [
        JournalsService,
    ]
})
export class JournalsModule {
}
