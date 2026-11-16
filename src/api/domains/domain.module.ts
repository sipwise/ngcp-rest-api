import {Module} from '@nestjs/common'

import {DomainController} from './domain.controller'
import {DomainService} from './domain.service'
import {DomainMariadbRepository} from './repositories/domain.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'

@Module({
    imports: [
        JournalModule,
    ],
    controllers: [DomainController],
    providers: [DomainService, DomainMariadbRepository],
})
export class DomainModule {
}
