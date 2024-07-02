import {forwardRef, Module} from '@nestjs/common'
import {HeaderManipulationRuleConditionController} from './header-manipulation-rule-condition.controller'
import {JournalModule} from '../../../../journals/journal.module'
import {ExpandModule} from '../../../../../helpers/expand.module'
import {HeaderManipulationRuleConditionService} from './header-manipulation-rule-condition.service'
import {HeaderManipulationRuleConditionMariadbRepository} from './repositories/header-manipulation-rule-condition.mariadb.repository'
import {HeaderManipulationRuleMariadbRepository} from '../repositories/header-manipulation-rule.mariadb.repository'
import {HeaderManipulationSetMariadbRepository} from '../../repositories/header-manipulation-set.mariadb.repository'

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
