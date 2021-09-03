import {Module} from '@nestjs/common'
import {InterceptorModule} from '../../interceptors/interceptor.module'
import {AdminsController} from './admins.controller'
import {AdminsService} from './admins.service'

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
