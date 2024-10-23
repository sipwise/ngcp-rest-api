import {forwardRef, Module} from '@nestjs/common'
import {ResellerService} from '~/api/resellers/reseller.service'
import {ResellerController} from '~/api/resellers/reseller.controller'
import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'
import {ResellerMariadbRepository} from '~/api/resellers/repositories/reseller.mariadb.repository'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
    ],
    providers: [ResellerService, ResellerMariadbRepository, ResellerController],
    controllers: [ResellerController],
    exports: [ResellerService, ResellerController],
})
export class ResellerModule {
}
