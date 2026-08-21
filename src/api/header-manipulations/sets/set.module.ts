import {Module,forwardRef} from '@nestjs/common'
import {JournalModule} from 'api/journals/journal.module'
import {ExpandModule} from 'helpers/expand.module'

import {HeaderManipulationSetController} from './set.controller'
import {HeaderManipulationSetService} from './set.service'
import {HeaderManipulationSetMariadbRepository} from './repositories/set.mariadb.repository'
import {HeaderManipulationSetRedisRepository} from './repositories/set.redis.repository'

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
