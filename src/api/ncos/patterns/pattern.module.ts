import {Module} from '@nestjs/common'

import {NCOSPatternController} from './pattern.controller'
import {NCOSPatternService} from './pattern.service'
import {NCOSPatternMariadbRepository} from './repositories/pattern.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'

@Module({
    imports: [
        JournalModule,
    ],
    controllers: [NCOSPatternController],
    providers: [NCOSPatternService, NCOSPatternMariadbRepository],
})
export class NCOSPatternModule {
}
