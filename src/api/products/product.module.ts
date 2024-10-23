import {InterceptorModule} from '~/interceptors/interceptor.module'
import {Module} from '@nestjs/common'
import {ProductController} from '~/api/products/product.controller'
import {ProductService} from '~/api/products/product.service'
import {ExpandModule} from '~/helpers/expand.module'
import {ProductMariadbRepository} from '~/api/products/repositories/product.mariadb.repository'

@Module({
    imports: [InterceptorModule, ExpandModule],
    providers: [ProductService, ProductMariadbRepository],
    controllers: [ProductController],
    exports: [ProductService],
})
export class ProductModule {
}
