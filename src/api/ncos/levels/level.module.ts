import {Module} from '@nestjs/common'

import {NCOSLevelController} from './level.controller'
import {NCOSLevelService} from './level.service'
import {NCOSLevelMariadbRepository} from './repositories/level.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'

@Module({
    imports: [
        JournalModule,
    ],
    controllers: [NCOSLevelController],
    providers: [NCOSLevelService, NCOSLevelMariadbRepository],
})
export class NCOSLevelModule {
}
