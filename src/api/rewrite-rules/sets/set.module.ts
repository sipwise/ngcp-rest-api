import {Module,forwardRef} from '@nestjs/common'
import {JournalModule} from 'api/journals/journal.module'
import {ExpandModule} from 'helpers/expand.module'

import {RewriteRuleSetMariadbRepository} from './repositories/set.mariadb.repository'
import {RewriteRuleSetRedisRepository} from './repositories/set.redis.repository'
import {RewriteRuleMariadbRepository} from './rules/repositories/rule.mariadb.repository'
import {RewriteRuleRedisRepository} from './rules/repositories/rule.redis.repository'
import {RewriteRuleService} from './rules/rule.service'
import {RewriteRuleSetController} from './set.controller'
import {RewriteRuleSetService} from './set.service'

import {TaskAgentModule} from '~/helpers/task-agent.module'

@Module({
    imports: [
        forwardRef(() => JournalModule),
        forwardRef(() => ExpandModule),
        forwardRef(() => TaskAgentModule),
    ],
    controllers: [RewriteRuleSetController],
    providers: [
        RewriteRuleSetController,
        RewriteRuleSetService,
        RewriteRuleSetMariadbRepository,
        RewriteRuleSetRedisRepository,
        RewriteRuleService,
        RewriteRuleMariadbRepository,
        RewriteRuleRedisRepository,
    ],
    exports: [
        RewriteRuleSetController,
        RewriteRuleSetService,
    ],
})
export class RewriteRuleSetModule {
}
