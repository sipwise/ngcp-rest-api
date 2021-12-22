import {Module} from '@nestjs/common'
import {InterceptorModule} from '../../interceptors/interceptor.module'
import {AdminsController} from './admins.controller'
import {AdminsService} from './admins.service'
import {AdminsRepository} from './admins.repository'
import {ResellersController} from '../resellers/resellers.controller'
import {CustomercontactsController} from '../customercontacts/customercontacts.controller'
import {ContractsController} from '../contracts/contracts.controller'
import {ResellersService} from '../resellers/resellers.service'
import {CustomercontactsService} from '../customercontacts/customercontacts.service'
import {ContractsService} from '../contracts/contracts.service'

@Module({
    imports: [InterceptorModule],
    controllers: [AdminsController],
    exports: [AdminsService, AdminsRepository],
    providers: [
        AdminsRepository,
        AdminsService,
        ResellersController,
        ResellersService,
        CustomercontactsController,
        CustomercontactsService,
        ContractsController,
        ContractsService,
    ],
})
export class AdminsModule {
}
