import {Module,forwardRef} from '@nestjs/common'

import {ResellerMariadbRepository} from './repositories/reseller.mariadb.repository'
import {ResellerController} from './reseller.controller'
import {ResellerService} from './reseller.service'

import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'

@Module({
    imports: [
        forwardRef(() => JournalModule),
        forwardRef(() => ExpandModule),
    ],
    providers: [ResellerService, ResellerMariadbRepository, ResellerController],
    controllers: [ResellerController],
    exports: [ResellerService, ResellerController],
})
export class ResellerModule {
}
