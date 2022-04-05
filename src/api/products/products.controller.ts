import {Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Query, Req, UseInterceptors} from '@nestjs/common'
import {ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Auth} from '../../decorators/auth.decorator'
import {AppService} from '../../app.service'
import {JournalingInterceptor} from '../../interceptors/journaling.interceptor'
import {JournalsService} from '../journals/journals.service'
import {LoggingInterceptor} from '../../interceptors/logging.interceptor'
import {ProductResponseDto} from './dto/product-response.dto'
import {ProductsService} from './products.service'
import {RBAC_ROLES} from '../../config/constants.config'
import {ExpandHelper} from '../../helpers/expand.helper'
import {ProductSearchDto} from './dto/product-search.dto'

const resourceName = 'products'

@ApiTags('Products')
@Controller(resourceName)
@UseInterceptors(LoggingInterceptor, new JournalingInterceptor(new JournalsService()))
@Auth(RBAC_ROLES.admin, RBAC_ROLES.system, RBAC_ROLES.reseller, RBAC_ROLES.lintercept)
export class ProductsController {
    constructor(
        private readonly productsService: ProductsService,
        private readonly journalsService: JournalsService,
        private readonly expander: ExpandHelper,
    ) {
    }

    @Get()
    @ApiOkResponse({
        type: [ProductResponseDto],
    })
    async findAll(
        @Query(
            'page',
            new DefaultValuePipe(AppService.config.common.api_default_query_page)
            , ParseIntPipe) page: number,
        @Query(
            'rows',
            new DefaultValuePipe(AppService.config.common.api_default_query_rows),
            ParseIntPipe) row: number,
        @Req() req,
    ): Promise<[ProductResponseDto[], number]> {
        const [responseList, totalCount] =
            await this.productsService.readAll(page, row, req)
        if (req.query.expand) {
            const productSearchDtoKeys = Object.keys(new ProductSearchDto())
            await this.expander.expandObjects(responseList, productSearchDtoKeys, req)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: ProductResponseDto,
    })
    async findOne(@Param('id', ParseIntPipe) id: number, @Req() req): Promise<ProductResponseDto> {
        const responseList = await this.productsService.read(id, req)
        if (req.query.expand && !req.isRedirected) {
            const productSearchDtoKeys = Object.keys(new ProductSearchDto())
            await this.expander.expandObjects(responseList, productSearchDtoKeys, req)
        }
        return responseList
    }
}
