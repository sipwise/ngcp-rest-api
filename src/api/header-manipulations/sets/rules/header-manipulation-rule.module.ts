import {Module,forwardRef} from '@nestjs/common'
import {JournalModule} from 'api/journals/journal.module'
import {ExpandModule} from 'helpers/expand.module'

import {HeaderManipulationRuleController} from './header-manipulation-rule.controller'
import {HeaderManipulationRuleService} from './header-manipulation-rule.service'
import {HeaderManipulationRuleMariadbRepository} from './repositories/header-manipulation-rule.mariadb.repository'

import {HeaderManipulationSetMariadbRepository} from '~/api/header-manipulations/sets/repositories/header-manipulation-set.mariadb.repository'

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
