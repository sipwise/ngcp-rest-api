import {Module,forwardRef} from '@nestjs/common'

import {HeaderManipulationRuleConditionController} from './header-manipulation-rule-condition.controller'
import {HeaderManipulationRuleConditionService} from './header-manipulation-rule-condition.service'
import {HeaderManipulationRuleConditionMariadbRepository} from './repositories/header-manipulation-rule-condition.mariadb.repository'

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
    controllers: [HeaderManipulationRuleConditionController],
    providers: [
        HeaderManipulationRuleConditionService,
        HeaderManipulationRuleMariadbRepository,
        HeaderManipulationSetMariadbRepository,
        HeaderManipulationSetRedisRepository,
        HeaderManipulationRuleConditionMariadbRepository,
    ],
})
export class HeaderManipulationRuleConditionModule {
}
