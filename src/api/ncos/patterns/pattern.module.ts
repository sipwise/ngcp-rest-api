import {Module,forwardRef} from '@nestjs/common'

import {NCOSPatternController} from './pattern.controller'
import {NCOSPatternService} from './pattern.service'
import {NCOSPatternMariadbRepository} from './repositories/pattern.mariadb.repository'

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
