import {Module} from '@nestjs/common'
import {ContractsService} from './contracts.service'
import {ContractsController} from './contracts.controller'
import {JournalsModule} from '../journals/journals.module'

@Module({
    imports: [JournalsModule],
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
