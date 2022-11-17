import {forwardRef, Module} from '@nestjs/common'
import {JournalModule} from '../journals/journal.module'
import {DomainController} from './domain.controller'
import {DomainService} from './domain.service'
import {ExpandModule} from '../../helpers/expand.module'
import {DomainMariadbRepository} from './repositories/domain.mariadb.repository'

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
