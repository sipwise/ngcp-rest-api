import {Module} from '@nestjs/common'
import {AdminsController} from './admins.controller'
import {AdminsService} from './admins.service'
import {InterceptorModule} from '../../interceptors/interceptor.module'

@Module({
    imports: [InterceptorModule],
    controllers: [AdminsController],
    exports: [AdminsService],
    providers: [
        AdminsService,
    ],
})
export class AdminsModule {
}
