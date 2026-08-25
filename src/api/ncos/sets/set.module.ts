import {Module,forwardRef} from '@nestjs/common'

import {NCOSSetMariadbRepository} from './repositories/set.mariadb.repository'
import {NCOSSetController} from './set.controller'
import {NCOSSetService} from './set.service'

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
