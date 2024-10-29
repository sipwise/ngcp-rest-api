import {Module,forwardRef} from '@nestjs/common'

import {HeaderManipulationRuleActionController} from './header-manipulation-rule-action.controller'
import {HeaderManipulationRuleActionService} from './header-manipulation-rule-action.service'
import {HeaderManipulationRuleActionMariadbRepository} from './repositories/header-manipulation-rule-action.mariadb.repository'

import {HeaderManipulationSetMariadbRepository} from '~/api/header-manipulations/sets/repositories/header-manipulation-set.mariadb.repository'
import {HeaderManipulationRuleMariadbRepository} from '~/api/header-manipulations/sets/rules/repositories/header-manipulation-rule.mariadb.repository'
import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
    ],
    controllers: [HeaderManipulationRuleActionController],
    providers: [HeaderManipulationRuleActionService, HeaderManipulationRuleMariadbRepository, HeaderManipulationSetMariadbRepository, HeaderManipulationRuleActionMariadbRepository],
})
export class HeaderManipulationRuleActionModule {
}
