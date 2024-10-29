import {Module,forwardRef} from '@nestjs/common'

import {DomainController} from './domain.controller'
import {DomainService} from './domain.service'
import {DomainMariadbRepository} from './repositories/domain.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
    ],
    controllers: [DomainController],
    providers: [DomainService, DomainMariadbRepository],
})
export class DomainModule {
}
