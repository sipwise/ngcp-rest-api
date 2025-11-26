import {Module,forwardRef} from '@nestjs/common'

import {HeaderManipulationRuleActionController} from './header-manipulation-rule-action.controller'
import {HeaderManipulationRuleActionService} from './header-manipulation-rule-action.service'
import {HeaderManipulationRuleActionMariadbRepository} from './repositories/header-manipulation-rule-action.mariadb.repository'

import {HeaderManipulationSetMariadbRepository} from '~/api/header-manipulations/sets/repositories/header-manipulation-set.mariadb.repository'
import {HeaderManipulationSetRedisRepository} from '~/api/header-manipulations/sets/repositories/header-manipulation-set.redis.repository'
import {HeaderManipulationRuleMariadbRepository} from '~/api/header-manipulations/sets/rules/repositories/header-manipulation-rule.mariadb.repository'
import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'
import {TaskAgentModule} from '~/helpers/task-agent.module'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
        forwardRef(() => TaskAgentModule),
    ],
    controllers: [HeaderManipulationRuleActionController],
    providers: [
        HeaderManipulationRuleActionService,
        HeaderManipulationRuleMariadbRepository,
        HeaderManipulationSetMariadbRepository,
        HeaderManipulationSetRedisRepository,
        HeaderManipulationRuleActionMariadbRepository,
    ],
})
export class HeaderManipulationRuleActionModule {
}
