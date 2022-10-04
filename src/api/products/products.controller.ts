import {Controller, Get, Param, ParseIntPipe, Req} from '@nestjs/common'
import {ApiExtraModels, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Auth} from '../../decorators/auth.decorator'
import {JournalsService} from '../journals/journals.service'
import {ProductResponseDto} from './dto/product-response.dto'
import {ProductsService} from './products.service'
import {RbacRole} from '../../config/constants.config'
import {ExpandHelper} from '../../helpers/expand.helper'
import {ProductSearchDto} from './dto/product-search.dto'
import {PaginatedDto} from '../paginated.dto'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'
import {CrudController} from '../../controllers/crud.controller'
import {LoggerService} from '../../logger/logger.service'

const resourceName = 'products'

@Auth(RbacRole.admin, RbacRole.system, RbacRole.reseller, RbacRole.lintercept)
@ApiTags('Products')
@ApiExtraModels(PaginatedDto)
@Controller(resourceName)
export class ProductsController extends CrudController<never, ProductResponseDto>{
    private readonly log = new LoggerService(ProductsController.name)

    constructor(
        private readonly productsService: ProductsService,
        private readonly journalsService: JournalsService,
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, productsService, journalsService)
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(ProductResponseDto)
    async readAll(
        @Req() req,
    ): Promise<[ProductResponseDto[], number]> {
        this.log.debug({message: 'fetch all products', func: this.readAll.name, url: req.url, method: req.method})
        const sr = this.newServiceRequest(req)
        const [products, totalCount] = await this.productsService.readAll(sr)
        const responseList = products.map(product => new ProductResponseDto(product))
        if (req.query.expand) {
            const productSearchDtoKeys = Object.keys(new ProductSearchDto())
            await this.expander.expandObjects(responseList, productSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: ProductResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, @Req() req): Promise<ProductResponseDto> {
        this.log.debug({message: 'fetch product by id', func: this.read.name, url: req.url, method: req.method})
        const product = await this.productsService.read(id, req)
        const response = new ProductResponseDto(product)
        if (req.query.expand && !req.isRedirected) {
            const productSearchDtoKeys = Object.keys(new ProductSearchDto())
            await this.expander.expandObjects(response, productSearchDtoKeys, req)
        }
        return response
    }
}
