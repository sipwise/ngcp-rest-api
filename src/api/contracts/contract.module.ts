import {forwardRef, Module} from '@nestjs/common'
import {ContractService} from '~/api/contracts/contract.service'
import {ContractController} from '~/api/contracts/contract.controller'
import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'
import {ContractMariadbRepository} from '~/api/contracts/repositories/contract.mariadb.repository'

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
