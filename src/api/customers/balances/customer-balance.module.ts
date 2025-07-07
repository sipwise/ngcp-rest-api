import {Module,forwardRef} from '@nestjs/common'

import {CustomerBalanceController} from './customer-balance.controller'
import {CustomerBalanceService} from './customer-balance.service'
import {CustomerBalanceMariadbRepository} from './repositories/customer-balance.mariadb.repository'

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
