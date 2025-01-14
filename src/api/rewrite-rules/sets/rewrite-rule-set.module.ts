import {Module,forwardRef} from '@nestjs/common'
import {JournalModule} from 'api/journals/journal.module'
import {ExpandModule} from 'helpers/expand.module'

import {RewriteRuleSetMariadbRepository} from './repositories/rewrite-rule-set.mariadb.repository'
import {RewriteRuleSetController} from './rewrite-rule-set.controller'
import {RewriteRuleSetService} from './rewrite-rule-set.service'
import {RewriteRuleMariadbRepository} from './rules/repositories/rewrite-rule.mariadb.repository'
import {RewriteRuleService} from './rules/rewrite-rule.service'

@Module({
    imports: [
        forwardRef(() => JournalModule),
        forwardRef(() => ExpandModule),
    ],
    controllers: [RewriteRuleSetController],
    providers: [
        RewriteRuleSetController,
        RewriteRuleSetService,
        RewriteRuleSetMariadbRepository,
        RewriteRuleService,
        RewriteRuleMariadbRepository,
    ],
    exports: [
        RewriteRuleSetController,
        RewriteRuleSetService,
    ],
})
export class RewriteRuleSetModule {
}
