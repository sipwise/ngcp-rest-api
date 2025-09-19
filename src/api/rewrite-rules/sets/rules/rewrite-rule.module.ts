import {Module,forwardRef} from '@nestjs/common'
import {JournalModule} from 'api/journals/journal.module'
import {ExpandModule} from 'helpers/expand.module'

import {RewriteRuleMariadbRepository} from './repositories/rewrite-rule.mariadb.repository'
import {RewriteRuleRedisRepository} from './repositories/rewrite-rule.redis.repository'
import {RewriteRuleController} from './rewrite-rule.controller'
import {RewriteRuleService} from './rewrite-rule.service'

import {RewriteRuleSetMariadbRepository} from '~/api/rewrite-rules/sets/repositories/rewrite-rule-set.mariadb.repository'
import {TaskAgentModule} from '~/helpers/task-agent.module'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
        forwardRef(() => TaskAgentModule),
    ],
    controllers: [RewriteRuleController],
    providers: [RewriteRuleService, RewriteRuleMariadbRepository, RewriteRuleSetMariadbRepository, RewriteRuleRedisRepository],
})
export class RewriteRuleModule {
}
