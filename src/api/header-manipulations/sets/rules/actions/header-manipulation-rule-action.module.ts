import {forwardRef, Module} from '@nestjs/common'
import {HeaderManipulationRuleActionController} from './header-manipulation-rule-action.controller'
import {JournalModule} from '../../../../journals/journal.module'
import {ExpandModule} from '../../../../../helpers/expand.module'
import {HeaderManipulationRuleActionService} from './header-manipulation-rule-action.service'
import {HeaderManipulationRuleActionMariadbRepository} from './repositories/header-manipulation-rule-action.mariadb.repository'
import {HeaderManipulationRuleMariadbRepository} from '../repositories/header-manipulation-rule.mariadb.repository'
import {HeaderManipulationSetMariadbRepository} from '../../repositories/header-manipulation-set.mariadb.repository'

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
