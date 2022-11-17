import {InterceptorModule} from '../../interceptors/interceptor.module'
import {Module} from '@nestjs/common'
import {ProductController} from './product.controller'
import {ProductService} from './product.service'
import {ExpandModule} from '../../helpers/expand.module'
import {ProductMariadbRepository} from './repositories/product.mariadb.repository'

@Module({
    imports: [InterceptorModule, ExpandModule],
    providers: [ProductService, ProductMariadbRepository],
    controllers: [ProductController],
    exports: [ProductService],
})
export class ProductModule {
}
