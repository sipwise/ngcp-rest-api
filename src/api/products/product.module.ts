import {Module} from '@nestjs/common'

import {ProductController} from './product.controller'
import {ProductService} from './product.service'
import {ProductMariadbRepository} from './repositories/product.mariadb.repository'

import {InterceptorModule} from '~/interceptors/interceptor.module'

@Module({
    imports: [InterceptorModule],
    providers: [ProductService, ProductMariadbRepository],
    controllers: [ProductController],
    exports: [ProductService],
})
export class ProductModule {
}
