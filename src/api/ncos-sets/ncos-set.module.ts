import {forwardRef, Module} from '@nestjs/common'
import {JournalModule} from '../journals/journal.module'
import {NCOSSetController} from './ncos-set.controller'
import {NCOSSetService} from './ncos-set.service'
import {NCOSSetMariadbRepository} from './repositories/ncos-set.mariadb.repository'
import {ExpandModule} from '../../helpers/expand.module'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
    ],
    controllers: [NCOSSetController],
    providers: [NCOSSetService, NCOSSetMariadbRepository],
})
export class NCOSSetModule {
}
