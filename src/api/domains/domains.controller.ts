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
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {AppService} from '../../app.service'
import {ResellersController} from '../resellers/resellers.controller'

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
        private readonly resellersController: ResellersController,
    ) {
        super(resourceName, domainsService, journalsService)
    }

    @Post()
    @ApiCreatedResponse({
        type: DomainResponseDto,
    })
    async create(entity: DomainCreateDto, req): Promise<DomainResponseDto> {
        return super.create(entity, req)
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
        const sr: ServiceRequest = {
            headers: [req.rawHeaders], params: [req.params], user: req.user, query: req.query,
        }
        return this.domainsService.readAll(page, rows, sr)
    }

    @Get(':id')
    @ApiOkResponse({
        type: DomainResponseDto,
    })
    @Roles(RBAC_ROLES.ccare, RBAC_ROLES.ccareadmin)
    async read(@Param('id', ParseIntPipe) id: number, req): Promise<DomainResponseDto> {
        return this.domainsService.read(id)
    }

    @Delete(':id')
    @ApiOkResponse({})
    async delete(@Param('id', ParseIntPipe) id: number, req): Promise<number> {
        return this.domainsService.delete(id, req)
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id', ParseIntPipe) id: number, page, row, req): Promise<JournalResponseDto[]> {
        return super.journal(id, page, row, req)
    }

}
