import {ApiCreatedResponse, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Auth} from '../../decorators/auth.decorator'
import {Controller, DefaultValuePipe, Delete, Get, Logger, Param, ParseIntPipe, Post, Query, Req} from '@nestjs/common'
import {CrudController} from '../../controllers/crud.controller'
import {DomainCreateDto} from './dto/domain-create.dto'
import {DomainResponseDto} from './dto/domain-response.dto'
import {DomainsService} from './domains.service'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {JournalsService} from '../journals/journals.service'
import {RBAC_ROLES} from '../../config/constants.config'
import {Roles} from '../../decorators/roles.decorator'
import {AppService} from '../../app.service'
import {ExpandHelper} from '../../helpers/expand.helper'
import {DomainSearchDto} from './dto/domain-search.dto'

const resourceName = 'domains'

@Auth(
    RBAC_ROLES.admin,
    RBAC_ROLES.reseller,
    RBAC_ROLES.system,
)
@ApiTags('Domains')
@Controller(resourceName)
export class DomainsController extends CrudController<DomainCreateDto, DomainResponseDto> {
    private readonly log = new Logger(DomainsController.name)

    constructor(
        private readonly domainsService: DomainsService,
        private readonly journalsService: JournalsService,
        private readonly expander: ExpandHelper
    ) {
        super(resourceName, domainsService, journalsService)
    }

    @Post()
    @ApiCreatedResponse({
        type: DomainResponseDto,
    })
    async create(entity: DomainCreateDto, req): Promise<DomainResponseDto> {
        return this.domainsService.create(entity, this.newServiceRequest(req))
    }

    @Get()
    @Roles(RBAC_ROLES.ccare, RBAC_ROLES.ccareadmin)
    @ApiOkResponse({
        type: [DomainResponseDto],
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
    ): Promise<DomainResponseDto[]> {
        this.log.debug({message: 'fetch all domains', func: this.readAll.name, url: req.url, method: req.method})
        const responseList = await this.domainsService.readAll(page, rows, this.newServiceRequest(req))
        if (req.query.expand) {
            let domainSearchDtoKeys = Object.keys(new DomainSearchDto())
            await this.expander.expandObjects(responseList, domainSearchDtoKeys, req)
        }
        return responseList
    }

    @Get(':id')
    @ApiOkResponse({
        type: DomainResponseDto,
    })
    @Roles(RBAC_ROLES.ccare, RBAC_ROLES.ccareadmin)
    async read(@Param('id', ParseIntPipe) id: number, req): Promise<DomainResponseDto> {
        const responseList = await this.domainsService.read(id, this.newServiceRequest(req))
        if (req.query.expand && !req.isRedirected) {
            let domainSearchDtoKeys = Object.keys(new DomainSearchDto())
            await this.expander.expandObjects(responseList, domainSearchDtoKeys, req)
        }
        return responseList
    }

    @Delete(':id')
    @ApiOkResponse({})
    async delete(@Param('id', ParseIntPipe) id: number, req): Promise<number> {
        return this.domainsService.delete(id, this.newServiceRequest(req))
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id', ParseIntPipe) id: number, page, row, req): Promise<JournalResponseDto[]> {
        return super.journal(id, page, row, req)
    }

}
