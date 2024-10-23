import {forwardRef, Module} from '@nestjs/common'
import {HeaderManipulationSetController} from '~/api/header-manipulations/sets/header-manipulation-set.controller'
import {JournalModule} from 'api/journals/journal.module'
import {ExpandModule} from 'helpers/expand.module'
import {HeaderManipulationSetService} from '~/api/header-manipulations/sets/header-manipulation-set.service'
import {HeaderManipulationSetMariadbRepository} from '~/api/header-manipulations/sets/repositories/header-manipulation-set.mariadb.repository'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
    ],
    controllers: [HeaderManipulationSetController],
    providers: [HeaderManipulationSetService, HeaderManipulationSetMariadbRepository],
})
export class HeaderManipulationSetModule {
}
