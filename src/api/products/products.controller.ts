import {
    Controller,
    DefaultValuePipe,
    Get,
    Logger,
    Param,
    ParseIntPipe,
    Query,
    Req,
    UseInterceptors,
} from '@nestjs/common'
import {ApiExtraModels, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Auth} from '../../decorators/auth.decorator'
import {AppService} from '../../app.service'
import {JournalingInterceptor} from '../../interceptors/journaling.interceptor'
import {JournalsService} from '../journals/journals.service'
import {LoggingInterceptor} from '../../interceptors/logging.interceptor'
import {ProductResponseDto} from './dto/product-response.dto'
import {ProductsService} from './products.service'
import {RbacRole} from '../../config/constants.config'
import {ExpandHelper} from '../../helpers/expand.helper'
import {ProductSearchDto} from './dto/product-search.dto'
import {PaginatedDto} from '../paginated.dto'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'

const resourceName = 'products'

@Auth(RbacRole.admin, RbacRole.system, RbacRole.reseller, RbacRole.lintercept)
@UseInterceptors(LoggingInterceptor, new JournalingInterceptor(new JournalsService()))
@ApiTags('Products')
@ApiExtraModels(PaginatedDto)
@Controller(resourceName)
export class ProductsController {
    private readonly log: Logger = new Logger(ProductsController.name)

    constructor(
        private readonly productsService: ProductsService,
        private readonly journalsService: JournalsService,
        private readonly expander: ExpandHelper,
    ) {
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(ProductResponseDto)
    async readAll(
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
        this.log.debug({message: 'fetch all products', func: this.readAll.name, url: req.url, method: req.method})
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
    async read(@Param('id', ParseIntPipe) id: number, @Req() req): Promise<ProductResponseDto> {
        this.log.debug({message: 'fetch product by id', func: this.read.name, url: req.url, method: req.method})
        const responseList = await this.productsService.read(id, req)
        if (req.query.expand && !req.isRedirected) {
            const productSearchDtoKeys = Object.keys(new ProductSearchDto())
            await this.expander.expandObjects(responseList, productSearchDtoKeys, req)
        }
        return responseList
    }
}
