import {Module,forwardRef} from '@nestjs/common'

import {NCOSSetLevelController} from './level.controller'
import {NCOSSetLevelService} from './level.service'
import {NCOSSetLevelMariadbRepository} from './repositories/level.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'
import {NCOSSetMariadbRepository} from '~/api/ncos/sets/repositories/set.mariadb.repository'
import {ExpandModule} from '~/helpers/expand.module'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
    ],
    controllers: [NCOSSetLevelController],
    providers: [
        NCOSSetLevelService,
        NCOSSetLevelMariadbRepository,
        NCOSSetMariadbRepository,
    ],
})
export class NCOSSetLevelModule {
}
