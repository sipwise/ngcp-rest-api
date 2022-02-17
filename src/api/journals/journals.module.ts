import {forwardRef, Module} from '@nestjs/common'
import {JournalsController} from './journals.controller'
import {JournalsService} from './journals.service'
import {ExpandModule} from '../../helpers/expand.module'

@Module({
    controllers: [JournalsController],
    imports: [
        //LoggingModule
        forwardRef(() => ExpandModule)
    ],
    providers: [
        JournalsService,
    ],
    exports: [
        JournalsService,
    ],
})
export class JournalsModule {
}
