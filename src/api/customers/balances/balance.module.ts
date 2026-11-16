import {Module} from '@nestjs/common'

import {CustomerBalanceController} from './balance.controller'
import {CustomerBalanceService} from './balance.service'
import {CustomerBalanceMariadbRepository} from './repositories/balance.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'

@Module({
    imports: [
        JournalModule,
    ],
    controllers: [CustomerBalanceController],
    providers: [CustomerBalanceService, CustomerBalanceMariadbRepository],
})
export class CustomerBalanceModule {
}
