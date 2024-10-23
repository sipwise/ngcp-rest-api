import {forwardRef, Module} from '@nestjs/common'
import {HeaderManipulationRuleActionController} from '~/api/header-manipulations/sets/rules/actions/header-manipulation-rule-action.controller'
import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'
import {HeaderManipulationRuleActionService} from '~/api/header-manipulations/sets/rules/actions/header-manipulation-rule-action.service'
import {HeaderManipulationRuleActionMariadbRepository} from '~/api/header-manipulations/sets/rules/actions/repositories/header-manipulation-rule-action.mariadb.repository'
import {HeaderManipulationRuleMariadbRepository} from '~/api/header-manipulations/sets/rules/repositories/header-manipulation-rule.mariadb.repository'
import {HeaderManipulationSetMariadbRepository} from '~/api/header-manipulations/sets/repositories/header-manipulation-set.mariadb.repository'

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
