import {Module} from '@nestjs/common'
import {ExpandHelper} from './expand.helper'
import {CustomercontactsController} from '../api/customercontacts/customercontacts.controller'
import {CustomercontactsModule} from '../api/customercontacts/customercontacts.module'
import {ResellersModule} from '../api/resellers/resellers.module'
import {ResellersController} from '../api/resellers/resellers.controller'
import {ContractsModule} from '../api/contracts/contracts.module'
import {ContractsController} from '../api/contracts/contracts.controller'
import {JournalsModule} from '../api/journals/journals.module'
import {JournalsService} from '../api/journals/journals.service'

@Module({
    imports: [
        CustomercontactsModule,
        ResellersModule,
        ContractsModule,
        JournalsModule
    ],
    providers: [
        ExpandHelper,
        CustomercontactsController,
        ResellersController,
        ContractsController,
        JournalsService
    ],
    exports: [ExpandHelper]
})
export class ExpandModule {

}