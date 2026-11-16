import {Module,forwardRef} from '@nestjs/common'

import {ContractController} from './contract.controller'
import {ContractService} from './contract.service'
import {ContractMariadbRepository} from './repositories/contract.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'

@Module({
    imports: [
        forwardRef(() => JournalModule),
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
