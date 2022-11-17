import {forwardRef, Module} from '@nestjs/common'
import {ResellerService} from './reseller.service'
import {ResellerController} from './reseller.controller'
import {JournalModule} from '../journals/journal.module'
import {ExpandModule} from '../../helpers/expand.module'
import {ResellerMariadbRepository} from './repositories/reseller.mariadb.repository'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
    ],
    providers: [ResellerService, ResellerMariadbRepository],
    controllers: [ResellerController],
    exports: [ResellerService],
})
export class ResellerModule {
}
