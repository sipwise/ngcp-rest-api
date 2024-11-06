import {Module,forwardRef} from '@nestjs/common'
import {JournalModule} from 'api/journals/journal.module'
import {ExpandModule} from 'helpers/expand.module'

import {RewriteRuleSetMariadbRepository} from './repositories/rewrite-rule-set.mariadb.repository'
import {RewriteRuleSetController} from './rewrite-rule-set.controller'
import {RewriteRuleSetService} from './rewrite-rule-set.service'

@Module({
    imports: [
        forwardRef(() => JournalModule),
        forwardRef(() => ExpandModule),
    ],
    controllers: [RewriteRuleSetController],
    providers: [RewriteRuleSetController, RewriteRuleSetService, RewriteRuleSetMariadbRepository],
    exports: [
        RewriteRuleSetController,
        RewriteRuleSetService,
    ],
})
export class RewriteRuleSetModule {
}
