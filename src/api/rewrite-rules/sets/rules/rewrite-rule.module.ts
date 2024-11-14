import {Module,forwardRef} from '@nestjs/common'
import {JournalModule} from 'api/journals/journal.module'
import {ExpandModule} from 'helpers/expand.module'

import {RewriteRuleMariadbRepository} from './repositories/rewrite-rule.mariadb.repository'
import {RewriteRuleController} from './rewrite-rule.controller'
import {RewriteRuleService} from './rewrite-rule.service'

import {RewriteRuleSetMariadbRepository} from '~/api/rewrite-rules/sets/repositories/rewrite-rule-set.mariadb.repository'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
    ],
    controllers: [RewriteRuleController],
    providers: [RewriteRuleService, RewriteRuleMariadbRepository, RewriteRuleSetMariadbRepository],
})
export class RewriteRuleModule {
}
