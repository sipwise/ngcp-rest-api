import {Module} from '@nestjs/common'
import {JournalsModule} from '../journals/journals.module'
import {DomainsController} from './domains.controller'
import {DomainsService} from './domains.service'

@Module({
    imports: [JournalsModule],
    controllers: [DomainsController],
    providers: [DomainsService],
})
export class DomainsModule {
}
