import {Module,forwardRef} from '@nestjs/common'
import {JournalModule} from 'api/journals/journal.module'
import {ExpandModule} from 'helpers/expand.module'

import {RewriteRuleSetMariadbRepository} from './repositories/rewrite-rule-set.mariadb.repository'
import {RewriteRuleSetRedisRepository} from './repositories/rewrite-rule-set.redis.repository'
import {RewriteRuleSetController} from './rewrite-rule-set.controller'
import {RewriteRuleSetService} from './rewrite-rule-set.service'
import {RewriteRuleMariadbRepository} from './rules/repositories/rewrite-rule.mariadb.repository'
import {RewriteRuleRedisRepository} from './rules/repositories/rewrite-rule.redis.repository'
import {RewriteRuleService} from './rules/rewrite-rule.service'

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
