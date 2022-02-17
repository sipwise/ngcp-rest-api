import {forwardRef, Module} from '@nestjs/common'
import {ContractsService} from './contracts.service'
import {ContractsController} from './contracts.controller'
import {JournalsModule} from '../journals/journals.module'
import {ExpandModule} from '../../helpers/expand.module'

@Module({
    imports: [
        JournalsModule,
        forwardRef(() => ExpandModule)
    ],
    providers: [
        ContractsController,
        ContractsService,
    ],
    controllers: [ContractsController],
    exports: [
        ContractsController,
        ContractsService,
    ],
})
export class ContractsModule {
}
