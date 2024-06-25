import {forwardRef, Module} from '@nestjs/common'
import {HeaderManipulationRuleController} from './header-manipulation-rule.controller'
import {JournalModule} from 'api/journals/journal.module'
import {ExpandModule} from 'helpers/expand.module'
import {HeaderManipulationRuleService} from './header-manipulation-rule.service'
import {HeaderManipulationRuleMariadbRepository} from './repositories/header-manipulation-rule.mariadb.repository'
import {HeaderManipulationSetMariadbRepository} from '../repositories/header-manipulation-set.mariadb.repository'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
    ],
    controllers: [HeaderManipulationRuleController],
    providers: [HeaderManipulationRuleService, HeaderManipulationRuleMariadbRepository, HeaderManipulationSetMariadbRepository],
})
export class HeaderManipulationRuleModule {
}
