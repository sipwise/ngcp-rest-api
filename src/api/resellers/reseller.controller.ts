import {Controller, forwardRef, Get, Inject, Param, ParseIntPipe, Patch, Post, Put, Req} from '@nestjs/common'
import {JournalService} from '../journals/journal.service'
import {ResellerService} from './reseller.service'
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
import {LoggerService} from '../../logger/logger.service'

const resourceName = 'resellers'

@Auth(RbacRole.admin, RbacRole.system)
@ApiTags('Reseller')
@ApiExtraModels(PaginatedDto)
@Controller(resourceName)
export class ResellerController extends CrudController<ResellerCreateDto, ResellerResponseDto> {
    private readonly log = new LoggerService(ResellerController.name)

    constructor(
        private readonly resellerService: ResellerService,
        private readonly journalService: JournalService,
        @Inject(forwardRef(() => ExpandHelper))
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, resellerService, journalService)
    }

    @Post()
    @ApiCreatedResponse({
        type: ResellerResponseDto,
    })
    async create(entity: ResellerCreateDto, req: Request): Promise<ResellerResponseDto> {
        this.log.debug({message: 'create reseller', func: this.create.name, url: req.url, method: req.method})
        const sr = this.newServiceRequest(req)
        const reseller = await this.resellerService.create(entity, sr)
        const response = new ResellerResponseDto(reseller)
        await this.journalService.writeJournal(sr, response.id, response)
        return response
    }

// TODO: could we use DELETE to terminate resellers? https://datatracker.ietf.org/doc/html/rfc7231#section-4.3.5

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(ResellerResponseDto)
    async readAll(@Req() req): Promise<[ResellerResponseDto[], number]> {
        this.log.debug({message: 'fetch all resellers', func: this.readAll.name, url: req.url, method: req.method})
        const sr = this.newServiceRequest(req)
        const [resellers, totalCount] =
            await this.resellerService.readAll(sr)
        const responseList = resellers.map(reseller => new ResellerResponseDto(reseller))
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
        const reseller = await this.resellerService.read(id, this.newServiceRequest(req))
        const responseItem = new ResellerResponseDto(reseller)
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
        const sr = this.newServiceRequest(req)
        const reseller = await this.resellerService.update(id, entity, sr)
        const response = new ResellerResponseDto(reseller)
        await this.journalService.writeJournal(sr, id, response)
        return response
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
        const sr = this.newServiceRequest(req)
        const reseller = await this.resellerService.adjust(id, patch, sr)
        const response = new ResellerResponseDto(reseller)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, @Req() req) {
        this.log.debug({
            message: 'fetch reseller journal by id',
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }
}