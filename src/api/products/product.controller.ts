import {Controller, Get, Param, ParseIntPipe, Req} from '@nestjs/common'
import {ApiExtraModels, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Auth} from '../../decorators/auth.decorator'
import {JournalService} from '../journals/journal.service'
import {ProductResponseDto} from './dto/product-response.dto'
import {ProductService} from './product.service'
import {RbacRole} from '../../config/constants.config'
import {ExpandHelper} from '../../helpers/expand.helper'
import {ProductSearchDto} from './dto/product-search.dto'
import {PaginatedDto} from '../../dto/paginated.dto'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'
import {CrudController} from '../../controllers/crud.controller'
import {LoggerService} from '../../logger/logger.service'
import {ServiceRequest} from '../../interfaces/service-request.interface'

const resourceName = 'products'

@Auth(RbacRole.admin, RbacRole.system, RbacRole.reseller, RbacRole.lintercept)
@ApiTags('Product')
@ApiExtraModels(PaginatedDto)
@Controller(resourceName)
export class ProductController extends CrudController<never, ProductResponseDto>{
    private readonly log = new LoggerService(ProductController.name)

    constructor(
        private readonly productService: ProductService,
        private readonly journalService: JournalService,
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, productService, journalService)
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(ProductResponseDto)
    async readAll(
        @Req() req,
    ): Promise<[ProductResponseDto[], number]> {
        this.log.debug({message: 'fetch all products', func: this.readAll.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const [products, totalCount] = await this.productService.readAll(sr)
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
        const product = await this.productService.read(id, req)
        const response = new ProductResponseDto(product)
        if (req.query.expand && !req.isRedirected) {
            const productSearchDtoKeys = Object.keys(new ProductSearchDto())
            await this.expander.expandObjects([response], productSearchDtoKeys, req)
        }
        return response
    }
}
