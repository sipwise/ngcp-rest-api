import {InterceptorModule} from '../../interceptors/interceptor.module'
import {Module} from '@nestjs/common'
import {ProductsController} from './products.controller'
import {ProductsService} from './products.service'
import {ExpandModule} from '../../helpers/expand.module'

@Module({
    imports: [InterceptorModule, ExpandModule],
    providers: [ProductsService],
    controllers: [ProductsController],
    exports: [ProductsService],
})
export class ProductsModule {
}
