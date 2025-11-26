import {Module,forwardRef} from '@nestjs/common'
import {JournalModule} from 'api/journals/journal.module'
import {ExpandModule} from 'helpers/expand.module'

import {HeaderManipulationRuleController} from './header-manipulation-rule.controller'
import {HeaderManipulationRuleService} from './header-manipulation-rule.service'
import {HeaderManipulationRuleMariadbRepository} from './repositories/header-manipulation-rule.mariadb.repository'

import {HeaderManipulationSetMariadbRepository} from '~/api/header-manipulations/sets/repositories/header-manipulation-set.mariadb.repository'
import {HeaderManipulationSetRedisRepository} from '~/api/header-manipulations/sets/repositories/header-manipulation-set.redis.repository'
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
