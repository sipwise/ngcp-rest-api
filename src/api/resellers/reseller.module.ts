import {Module,forwardRef} from '@nestjs/common'

import {ResellerMariadbRepository} from './repositories/reseller.mariadb.repository'
import {ResellerController} from './reseller.controller'
import {ResellerService} from './reseller.service'

import {JournalModule} from '~/api/journals/journal.module'

@Module({
    imports: [
        forwardRef(() => JournalModule),
    ],
    providers: [ResellerService, ResellerMariadbRepository, ResellerController],
    controllers: [ResellerController],
    exports: [ResellerService, ResellerController],
})
export class ResellerModule {
}
