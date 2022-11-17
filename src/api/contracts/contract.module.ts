import {forwardRef, Module} from '@nestjs/common'
import {ContractService} from './contract.service'
import {ContractController} from './contract.controller'
import {JournalModule} from '../journals/journal.module'
import {ExpandModule} from '../../helpers/expand.module'
import {ContractMariadbRepository} from './repositories/contract.mariadb.repository'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
    ],
    providers: [
        ContractController,
        ContractService,
        ContractMariadbRepository,
    ],
    controllers: [ContractController],
    exports: [
        ContractController,
        ContractService,
    ],
})
export class ContractModule {
}
