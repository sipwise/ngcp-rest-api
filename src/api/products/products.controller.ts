
import {Controller, DefaultValuePipe, Get, ParseIntPipe, Param, Query, Req, UseInterceptors} from "@nestjs/common"
import {ApiOkResponse, ApiTags} from "@nestjs/swagger"
import {Auth} from "decorators/auth.decorator"
import {AppService} from "app.service"
import {JournalingInterceptor} from "interceptors/journaling.interceptor"
import {JournalsService} from "api/journals/journals.service"
import {LoggingInterceptor} from "interceptors/logging.interceptor"
import {ProductsResponseDto} from "./dto/products-response.dto"
import {ProductsService} from "./products.service"
import {RBAC_ROLES} from "config/constants.config"

@ApiTags('Products')
@Controller('Products')
@UseInterceptors(LoggingInterceptor, new JournalingInterceptor(new JournalsService()))
@Auth(RBAC_ROLES.admin, RBAC_ROLES.system, RBAC_ROLES.reseller, RBAC_ROLES.lintercept)
export class ProductsController {
    constructor(private readonly productService: ProductsService, private readonly journalService: JournalsService) {
    }

    @Get()
    @ApiOkResponse({
        type: [ProductsResponseDto],
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
    ): Promise<ProductsResponseDto[]> {
        return await this.productService.readAll(page, row, req)
    }

    @Get(':id')
    @ApiOkResponse({
        type: ProductsResponseDto,
    })
    async findOne(@Param('id', ParseIntPipe) id: number, @Req() req): Promise<ProductsResponseDto> {
        return await this.productService.read(id, req)
    }
}