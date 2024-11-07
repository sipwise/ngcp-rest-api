import {Controller, Get, Param, ParseIntPipe, Req} from '@nestjs/common'
import {ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {ProductResponseDto} from './dto/product-response.dto'
import {ProductSearchDto} from './dto/product-search.dto'
import {ProductService} from './product.service'

import {JournalService} from '~/api/journals/journal.service'
import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {ExpandHelper} from '~/helpers/expand.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

const resourceName = 'products'

@Auth(
    RbacRole.admin,
    RbacRole.system,
    RbacRole.reseller,
    RbacRole.lintercept,
)
@ApiTags('Product')
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
        @Req() req: Request,
    ): Promise<[ProductResponseDto[], number]> {
        this.log.debug({message: 'fetch all products', func: this.readAll.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const [products, totalCount] = await this.productService.readAll(sr)
        const responseList = products.map(product => new ProductResponseDto(product))
        if (sr.query.expand) {
            const productSearchDtoKeys = Object.keys(new ProductSearchDto())
            await this.expander.expandObjects(responseList, productSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: ProductResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, @Req() req: Request): Promise<ProductResponseDto> {
        this.log.debug({message: 'fetch product by id', func: this.read.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const product = await this.productService.read(id, sr)
        const response = new ProductResponseDto(product)
        if (sr.query.expand && !sr.isInternalRedirect) {
            const productSearchDtoKeys = Object.keys(new ProductSearchDto())
            await this.expander.expandObjects([response], productSearchDtoKeys, sr)
        }
        return response
    }
}
