import {Module,forwardRef} from '@nestjs/common'

import {NCOSLevelController} from './ncos-level.controller'
import {NCOSLevelService} from './ncos-level.service'
import {NCOSLevelMariadbRepository} from './repositories/ncos-level.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
    ],
    controllers: [NCOSLevelController],
    providers: [NCOSLevelService, NCOSLevelMariadbRepository],
})
export class NCOSLevelModule {
}
