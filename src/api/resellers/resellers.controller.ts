import {
    Controller,
    DefaultValuePipe,
    forwardRef,
    Get,
    Inject,
    Logger,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Query,
    Req,
} from '@nestjs/common'
import {JournalsService} from '../journals/journals.service'
import {ResellersService} from './resellers.service'
import {CrudController} from '../../controllers/crud.controller'
import {ResellerCreateDto} from './dto/reseller-create.dto'
import {ResellerResponseDto} from './dto/reseller-response.dto'
import {Auth} from '../../decorators/auth.decorator'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {ApiBody, ApiCreatedResponse, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Operation} from '../../helpers/patch.helper'
import {Request} from 'express'
import {RBAC_ROLES} from '../../config/constants.config'
import {PatchDto} from '../patch.dto'
import {AppService} from '../../app.service'
import {ExpandHelper} from '../../helpers/expand.helper'
import {ResellerSearchDto} from './dto/reseller-search.dto'

const resourceName = 'resellers'

@Auth(RBAC_ROLES.admin, RBAC_ROLES.system)
@ApiTags('Resellers')
@Controller(resourceName)
export class ResellersController extends CrudController<ResellerCreateDto, ResellerResponseDto> {
    private readonly log = new Logger(ResellersController.name)

    constructor(
        private readonly resellersService: ResellersService,
        private readonly journalsService: JournalsService,
        @Inject(forwardRef(() => ExpandHelper))
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, resellersService, journalsService)
    }

    @Post()
    @ApiCreatedResponse({
        type: ResellerResponseDto,
    })
    async create(entity: ResellerCreateDto, req: Request): Promise<ResellerResponseDto> {
        return this.resellersService.create(entity, this.newServiceRequest(req))
    }

    @Get()
    @ApiOkResponse({
        type: [ResellerResponseDto],
    })
    async readAll(
        @Query(
            'page',
            new DefaultValuePipe(AppService.config.common.api_default_query_page),
            ParseIntPipe) page: number,
        @Query(
            'rows',
            new DefaultValuePipe(AppService.config.common.api_default_query_rows),
            ParseIntPipe) rows: number,
        @Req() req,
    ): Promise<[ResellerResponseDto[], number]> {
        this.log.debug({message: 'fetch all resellers', func: this.readAll.name, url: req.url, method: req.method})
        const [responseList, totalCount] =
            await this.resellersService.readAll(page, rows, this.newServiceRequest(req))
        if (req.query.expand) {
            const resellerSearchDtoKeys = Object.keys(new ResellerSearchDto())
            await this.expander.expandObjects(responseList, resellerSearchDtoKeys, req)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: ResellerResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, req): Promise<ResellerResponseDto> {
        const responseItem = await this.resellersService.read(id, this.newServiceRequest(req))
        if (req.query.expand && !req.isRedirected) {
            const resellerSearchDtoKeys = Object.keys(new ResellerSearchDto())
            await this.expander.expandObjects(responseItem, resellerSearchDtoKeys, req)
        }
        return responseItem
    }

    @Put(':id')
    @ApiOkResponse({
        type: ResellerResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number, entity: ResellerCreateDto, req): Promise<ResellerResponseDto> {
        return this.resellersService.update(id, entity, this.newServiceRequest(req))
    }

    @Patch(':id')
    @ApiOkResponse({
        type: ResellerResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(@Param('id', ParseIntPipe) id: number, patch: Operation | Operation[], req): Promise<ResellerResponseDto> {
        return this.resellersService.adjust(id, patch, this.newServiceRequest(req))
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id', ParseIntPipe) id: number, page, row, req): Promise<[JournalResponseDto[], number]> {
        return super.journal(id, page, row, req)
    }
}
