import {forwardRef, Module} from '@nestjs/common'
import {JournalsModule} from '../journals/journals.module'
import {DomainsController} from './domains.controller'
import {DomainsService} from './domains.service'
import {ExpandModule} from '../../helpers/expand.module'
import {DomainsMariadbRepository} from './repositories/domains.mariadb.repository'

@Module({
    imports: [
        JournalsModule,
        forwardRef(() => ExpandModule),
    ],
    controllers: [DomainsController],
    providers: [DomainsService, DomainsMariadbRepository],
})
export class DomainsModule {
}
