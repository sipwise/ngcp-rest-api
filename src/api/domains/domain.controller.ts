import {ApiCreatedResponse, ApiExtraModels, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Auth} from '../../decorators/auth.decorator'
import {Controller, Delete, forwardRef, Get, Inject, Param, ParseIntPipe, Post, Req} from '@nestjs/common'
import {CrudController} from '../../controllers/crud.controller'
import {DomainCreateDto} from './dto/domain-create.dto'
import {DomainResponseDto} from './dto/domain-response.dto'
import {DomainService} from './domain.service'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {JournalService} from '../journals/journal.service'
import {RbacRole} from '../../config/constants.config'
import {Roles} from '../../decorators/roles.decorator'
import {ExpandHelper} from '../../helpers/expand.helper'
import {DomainSearchDto} from './dto/domain-search.dto'
import {PaginatedDto} from '../paginated.dto'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'
import {LoggerService} from '../../logger/logger.service'
import {ServiceRequest} from '../../interfaces/service-request.interface'

const resourceName = 'domains'

@Auth(
    RbacRole.admin,
    RbacRole.reseller,
    RbacRole.system,
)
@ApiTags('Domain')
@ApiExtraModels(PaginatedDto)
@Controller(resourceName)
export class DomainController extends CrudController<DomainCreateDto, DomainResponseDto> {
    private readonly log = new LoggerService(DomainController.name)

    constructor(
        private readonly domainService: DomainService,
        private readonly journalService: JournalService,
        @Inject(forwardRef(() => ExpandHelper))
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, domainService, journalService)
    }

    @Post()
    @ApiCreatedResponse({
        type: DomainResponseDto,
    })
    async create(entity: DomainCreateDto, req): Promise<DomainResponseDto> {
        this.log.debug({message: 'create domain', func: this.readAll.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const domain = await this.domainService.create(entity.toInternal(), sr)
        const response = new DomainResponseDto(domain)
        await this.journalService.writeJournal(sr, response.id, response)
        return response
    }

    @Get()
    @Roles(RbacRole.ccare, RbacRole.ccareadmin)
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(DomainResponseDto)
    async readAll(@Req() req): Promise<[DomainResponseDto[], number]> {
        this.log.debug({message: 'fetch all domains', func: this.readAll.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const [domains, totalCount] =
            await this.domainService.readAll(sr)
        const responseList = domains.map(dom => new DomainResponseDto(dom))
        if (req.query.expand) {
            const domainSearchDtoKeys = Object.keys(new DomainSearchDto())
            await this.expander.expandObjects(responseList, domainSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: DomainResponseDto,
    })
    @Roles(RbacRole.ccare, RbacRole.ccareadmin)
    async read(@Param('id', ParseIntPipe) id: number, req): Promise<DomainResponseDto> {
        this.log.debug({message: 'fetch domain by id', func: this.read.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const domain = await this.domainService.read(id, sr)
        const responseItem = new DomainResponseDto(domain)
        if (req.query.expand && !req.isRedirected) {
            const domainSearchDtoKeys = Object.keys(new DomainSearchDto())
            await this.expander.expandObjects(responseItem, domainSearchDtoKeys, sr)
        }
        return responseItem
    }

    @Delete(':id')
    @ApiOkResponse({})
    async delete(@Param('id', ParseIntPipe) id: number, req): Promise<number> {
        this.log.debug({message: 'delete domain by id', func: this.delete.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const response = await this.domainService.delete(id, sr)
        await this.journalService.writeJournal(sr, id, {})
        return response
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, @Req() req) {
        this.log.debug({message: 'read domain journal by id', func: this.delete.name, url: req.url, method: req.method})
        return super.journal(id, req)
    }

}
