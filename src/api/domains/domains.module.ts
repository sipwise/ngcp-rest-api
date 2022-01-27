import {Module} from '@nestjs/common'
import {JournalsModule} from '../journals/journals.module'
import {DomainsController} from './domains.controller'
import {DomainsService} from './domains.service'
import {ResellersController} from '../resellers/resellers.controller'
import {ResellersModule} from '../resellers/resellers.module'

@Module({
    imports: [JournalsModule, ResellersModule],
    controllers: [DomainsController],
    providers: [DomainsService, ResellersController],
})
export class DomainsModule {
}
