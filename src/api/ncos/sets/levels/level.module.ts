import {Module} from '@nestjs/common'

import {NCOSSetLevelController} from './level.controller'
import {NCOSSetLevelService} from './level.service'
import {NCOSSetLevelMariadbRepository} from './repositories/level.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'
import {NCOSSetMariadbRepository} from '~/api/ncos/sets/repositories/set.mariadb.repository'

@Module({
    imports: [
        JournalModule,
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
