import {Module} from '@nestjs/common'
import {InterceptorModule} from '../../interceptors/interceptor.module'
import {AdminsController} from './admins.controller'
import {AdminsService} from './admins.service'
import {AdminsRepository} from './admins.repository'

@Module({
    imports: [InterceptorModule],
    controllers: [AdminsController],
    exports: [AdminsService, AdminsRepository],
    providers: [
        AdminsRepository,
        AdminsService
    ],
})
export class AdminsModule {
}
