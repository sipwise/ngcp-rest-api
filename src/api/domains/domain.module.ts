import {forwardRef, Module} from '@nestjs/common'
import {JournalModule} from '~/api/journals/journal.module'
import {DomainController} from '~/api/domains/domain.controller'
import {DomainService} from '~/api/domains/domain.service'
import {ExpandModule} from '~/helpers/expand.module'
import {DomainMariadbRepository} from '~/api/domains/repositories/domain.mariadb.repository'

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
