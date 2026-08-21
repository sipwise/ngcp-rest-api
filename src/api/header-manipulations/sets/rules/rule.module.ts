import {Module,forwardRef} from '@nestjs/common'
import {JournalModule} from 'api/journals/journal.module'
import {ExpandModule} from 'helpers/expand.module'

import {HeaderManipulationRuleController} from './rule.controller'
import {HeaderManipulationRuleService} from './rule.service'
import {HeaderManipulationRuleMariadbRepository} from './repositories/rule.mariadb.repository'

import {HeaderManipulationSetMariadbRepository} from '~/api/header-manipulations/sets/repositories/set.mariadb.repository'
import {HeaderManipulationSetRedisRepository} from '~/api/header-manipulations/sets/repositories/set.redis.repository'
import {TaskAgentModule} from '~/helpers/task-agent.module'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
        forwardRef(() => TaskAgentModule),
    ],
    controllers: [HeaderManipulationRuleController],
    providers: [
        HeaderManipulationRuleService,
        HeaderManipulationRuleMariadbRepository,
        HeaderManipulationSetMariadbRepository,
        HeaderManipulationSetRedisRepository,
    ],
})
export class HeaderManipulationRuleModule {
}
