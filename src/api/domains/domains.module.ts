import {Module} from '@nestjs/common'
import {JournalsModule} from '../journals/journals.module'
import {DomainsController} from './domains.controller'
import {DomainsService} from './domains.service'
import {ResellersController} from '../resellers/resellers.controller'
import {ResellersModule} from '../resellers/resellers.module'
import {ExpandModule} from '../../helpers/expand.module'

@Module({
    imports: [JournalsModule, ResellersModule, ExpandModule],
    controllers: [DomainsController],
    providers: [DomainsService, ResellersController],
})
export class DomainsModule {
}
