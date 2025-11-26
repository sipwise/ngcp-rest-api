import {Module,forwardRef} from '@nestjs/common'
import {JournalModule} from 'api/journals/journal.module'
import {ExpandModule} from 'helpers/expand.module'

import {HeaderManipulationSetController} from './header-manipulation-set.controller'
import {HeaderManipulationSetService} from './header-manipulation-set.service'
import {HeaderManipulationSetMariadbRepository} from './repositories/header-manipulation-set.mariadb.repository'
import {HeaderManipulationSetRedisRepository} from './repositories/header-manipulation-set.redis.repository'

import {TaskAgentModule} from '~/helpers/task-agent.module'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
        forwardRef(() => TaskAgentModule),
    ],
    controllers: [HeaderManipulationSetController],
    providers: [
        HeaderManipulationSetService,
        HeaderManipulationSetMariadbRepository,
        HeaderManipulationSetRedisRepository,
    ],
})
export class HeaderManipulationSetModule {
}
