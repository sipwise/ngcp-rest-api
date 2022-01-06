import {InterceptorModule} from '../../interceptors/interceptor.module'
import {Module} from '@nestjs/common'
import {ProductsController} from './products.controller'
import {ProductsService} from './products.service'
@Module({
    imports: [InterceptorModule],
    providers: [ProductsService],
    controllers: [ProductsController],
    exports: [ProductsService],
})
export class ProductsModule {}