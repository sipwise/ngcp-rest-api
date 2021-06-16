import {Module} from '@nestjs/common'
import {DomainsService} from './domains.service'
import {DomainsController} from './domains.controller'
import {domainsProviders} from './domains.providers'
import {JournalsModule} from '../journals/journals.module'

@Module({
    imports: [JournalsModule],
    providers: [DomainsService, ...domainsProviders],
    controllers: [DomainsController],
})
export class DomainsModule {
}
