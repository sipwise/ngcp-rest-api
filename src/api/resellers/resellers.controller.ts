import {Controller, forwardRef, Get, Inject, Logger, Param, ParseIntPipe, Patch, Post, Put, Req} from '@nestjs/common'
import {JournalsService} from '../journals/journals.service'
import {ResellersService} from './resellers.service'
import {CrudController} from '../../controllers/crud.controller'
import {ResellerCreateDto} from './dto/reseller-create.dto'
import {ResellerResponseDto} from './dto/reseller-response.dto'
import {Auth} from '../../decorators/auth.decorator'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {
    ApiBody,
    ApiConsumes,
    ApiCreatedResponse,
    ApiExtraModels,
    ApiOkResponse,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger'
import {Operation} from '../../helpers/patch.helper'
import {Request} from 'express'
import {RbacRole} from '../../config/constants.config'
import {PatchDto} from '../patch.dto'
import {ExpandHelper} from '../../helpers/expand.helper'
import {ResellerSearchDto} from './dto/reseller-search.dto'
import {PaginatedDto} from '../paginated.dto'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'

const resourceName = 'resellers'

@Auth(RbacRole.admin, RbacRole.system)
@ApiTags('Resellers')
@ApiExtraModels(PaginatedDto)
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
        this.log.debug({message: 'create reseller', func: this.create.name, url: req.url, method: req.method})
        return this.resellersService.create(entity, this.newServiceRequest(req))
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(ResellerResponseDto)
    async readAll(@Req() req): Promise<[ResellerResponseDto[], number]> {
        this.log.debug({message: 'fetch all resellers', func: this.readAll.name, url: req.url, method: req.method})
        const sr = this.newServiceRequest(req)
        const [responseList, totalCount] =
            await this.resellersService.readAll(sr)
        if (req.query.expand) {
            const resellerSearchDtoKeys = Object.keys(new ResellerSearchDto())
            await this.expander.expandObjects(responseList, resellerSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: ResellerResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, req): Promise<ResellerResponseDto> {
        this.log.debug({message: 'fetch reseller by id', func: this.read.name, url: req.url, method: req.method})
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
        this.log.debug({message: 'update reseller by id', func: this.update.name, url: req.url, method: req.method})
        return this.resellersService.update(id, entity, this.newServiceRequest(req))
    }

    @Patch(':id')
    @ApiConsumes('application/json-patch+json')
    @ApiOkResponse({
        type: ResellerResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(@Param('id', ParseIntPipe) id: number, patch: Operation | Operation[], req): Promise<ResellerResponseDto> {
        this.log.debug({message: 'patch reseller by id', func: this.adjust.name, url: req.url, method: req.method})
        return this.resellersService.adjust(id, patch, this.newServiceRequest(req))
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id', ParseIntPipe) id: number, page, row, req): Promise<[JournalResponseDto[], number]> {
        this.log.debug({message: 'fetch reseller journal by id', func: this.journal.name, url: req.url, method: req.method})
        return super.journal(id, page, row, req)
    }
}
