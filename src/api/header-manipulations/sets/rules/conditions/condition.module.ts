import {Module,forwardRef} from '@nestjs/common'

import {HeaderManipulationRuleConditionController} from './condition.controller'
import {HeaderManipulationRuleConditionService} from './condition.service'
import {HeaderManipulationRuleConditionMariadbRepository} from './repositories/condition.mariadb.repository'

import {HeaderManipulationSetMariadbRepository} from '~/api/header-manipulations/sets/repositories/set.mariadb.repository'
import {HeaderManipulationSetRedisRepository} from '~/api/header-manipulations/sets/repositories/set.redis.repository'
import {HeaderManipulationRuleMariadbRepository} from '~/api/header-manipulations/sets/rules/repositories/rule.mariadb.repository'
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
