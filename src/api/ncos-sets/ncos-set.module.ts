import {Module,forwardRef} from '@nestjs/common'

import {NCOSSetController} from './ncos-set.controller'
import {NCOSSetService} from './ncos-set.service'
import {NCOSSetMariadbRepository} from './repositories/ncos-set.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'

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
