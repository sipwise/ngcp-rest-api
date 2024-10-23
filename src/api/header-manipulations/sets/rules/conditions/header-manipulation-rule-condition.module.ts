import {forwardRef, Module} from '@nestjs/common'
import {HeaderManipulationRuleConditionController} from '~/api/header-manipulations/sets/rules/conditions/header-manipulation-rule-condition.controller'
import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'
import {HeaderManipulationRuleConditionService} from '~/api/header-manipulations/sets/rules/conditions/header-manipulation-rule-condition.service'
import {HeaderManipulationRuleConditionMariadbRepository} from '~/api/header-manipulations/sets/rules/conditions/repositories/header-manipulation-rule-condition.mariadb.repository'
import {HeaderManipulationRuleMariadbRepository} from '~/api/header-manipulations/sets/rules/repositories/header-manipulation-rule.mariadb.repository'
import {HeaderManipulationSetMariadbRepository} from '~/api/header-manipulations/sets/repositories/header-manipulation-set.mariadb.repository'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
    ],
    controllers: [HeaderManipulationRuleConditionController],
    providers: [HeaderManipulationRuleConditionService, HeaderManipulationRuleMariadbRepository, HeaderManipulationSetMariadbRepository, HeaderManipulationRuleConditionMariadbRepository],
})
export class HeaderManipulationRuleConditionModule {
}
