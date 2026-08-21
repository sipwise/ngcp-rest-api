import {Module,forwardRef} from '@nestjs/common'

import {CustomerBalanceController} from './balance.controller'
import {CustomerBalanceService} from './balance.service'
import {CustomerBalanceMariadbRepository} from './repositories/balance.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
    ],
    controllers: [CustomerBalanceController],
    providers: [CustomerBalanceService, CustomerBalanceMariadbRepository],
})
export class CustomerBalanceModule {
}
