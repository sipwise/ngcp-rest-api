import {Module} from '@nestjs/common'
import {DomainsService} from './domains.service'
import {DomainsController} from './domains.controller'
import {JournalsModule} from '../journals/journals.module'

@Module({
    imports: [JournalsModule],
    controllers: [DomainsController],
    exports: [DomainsService],
    providers: [
        DomainsService,
    ],
})
export class DomainsModule {
}
