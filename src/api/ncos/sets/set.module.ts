import {Module} from '@nestjs/common'

import {NCOSSetMariadbRepository} from './repositories/set.mariadb.repository'
import {NCOSSetController} from './set.controller'
import {NCOSSetService} from './set.service'

import {JournalModule} from '~/api/journals/journal.module'

@Module({
    imports: [
        JournalModule,
    ],
    controllers: [NCOSSetController],
    providers: [NCOSSetService, NCOSSetMariadbRepository],
})
export class NCOSSetModule {
}
