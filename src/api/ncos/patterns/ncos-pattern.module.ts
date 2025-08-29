import {Module,forwardRef} from '@nestjs/common'

import {NCOSPatternController} from './ncos-pattern.controller'
import {NCOSPatternService} from './ncos-pattern.service'
import {NCOSPatternMariadbRepository} from './repositories/ncos-pattern.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
    ],
    controllers: [NCOSPatternController],
    providers: [NCOSPatternService, NCOSPatternMariadbRepository],
})
export class NCOSPatternModule {
}
