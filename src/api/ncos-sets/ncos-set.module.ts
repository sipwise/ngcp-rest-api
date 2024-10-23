import {forwardRef, Module} from '@nestjs/common'
import {JournalModule} from '~/api/journals/journal.module'
import {NCOSSetController} from '~/api/ncos-sets/ncos-set.controller'
import {NCOSSetService} from '~/api/ncos-sets/ncos-set.service'
import {NCOSSetMariadbRepository} from '~/api/ncos-sets/repositories/ncos-set.mariadb.repository'
import {ExpandModule} from '~/helpers/expand.module'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
    ],
    controllers: [NCOSSetController],
    providers: [NCOSSetService, NCOSSetMariadbRepository],
})
export class NCOSSetModule {
}
