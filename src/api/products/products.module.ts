import {InterceptorModule} from '../../interceptors/interceptor.module'
import {Module} from '@nestjs/common'
import {ProductsController} from './products.controller'
import {ProductsService} from './products.service'
import {ExpandModule} from '../../helpers/expand.module'
import {ProductsMariadbRepository} from './repositories/products.mariadb.repository'

@Module({
    imports: [InterceptorModule, ExpandModule],
    providers: [ProductsService, ProductsMariadbRepository],
    controllers: [ProductsController],
    exports: [ProductsService],
})
export class ProductsModule {
}
