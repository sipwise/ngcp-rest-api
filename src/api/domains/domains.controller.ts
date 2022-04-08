import {ApiCreatedResponse, ApiExtraModels, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Auth} from '../../decorators/auth.decorator'
import {Controller, Delete, Get, Logger, Param, ParseIntPipe, Post, Req} from '@nestjs/common'
import {CrudController} from '../../controllers/crud.controller'
import {DomainCreateDto} from './dto/domain-create.dto'
import {DomainResponseDto} from './dto/domain-response.dto'
import {DomainsService} from './domains.service'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {JournalsService} from '../journals/journals.service'
import {RBAC_ROLES} from '../../config/constants.config'
import {Roles} from '../../decorators/roles.decorator'
import {ExpandHelper} from '../../helpers/expand.helper'
import {DomainSearchDto} from './dto/domain-search.dto'
import {PaginatedDto} from '../paginated.dto'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'

const resourceName = 'domains'

@Auth(
    RBAC_ROLES.admin,
    RBAC_ROLES.reseller,
    RBAC_ROLES.system,
)
@ApiTags('Domains')
@ApiExtraModels(PaginatedDto)
@Controller(resourceName)
export class DomainsController extends CrudController<DomainCreateDto, DomainResponseDto> {
    private readonly log = new Logger(DomainsController.name)

    constructor(
        private readonly domainsService: DomainsService,
        private readonly journalsService: JournalsService,
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, domainsService, journalsService)
    }

    @Post()
    @ApiCreatedResponse({
        type: DomainResponseDto,
    })
    async create(entity: DomainCreateDto, req): Promise<DomainResponseDto> {
        const domain = await this.domainsService.create(entity.toInternal(), this.newServiceRequest(req))
        return new DomainResponseDto(domain)
    }

    @Get()
    @Roles(RBAC_ROLES.ccare, RBAC_ROLES.ccareadmin)
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(DomainResponseDto)
    async readAll(@Req() req): Promise<[DomainResponseDto[], number]> {
        this.log.debug({message: 'fetch all domains', func: this.readAll.name, url: req.url, method: req.method})
        const sr = this.newServiceRequest(req)
        const [domains, totalCount] =
            await this.domainsService.readAll(sr)
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
    @Roles(RBAC_ROLES.ccare, RBAC_ROLES.ccareadmin)
    async read(@Param('id', ParseIntPipe) id: number, req): Promise<DomainResponseDto> {
        const domain = await this.domainsService.read(id, this.newServiceRequest(req))
        const responseItem = new DomainResponseDto(domain)
        if (req.query.expand && !req.isRedirected) {
            const domainSearchDtoKeys = Object.keys(new DomainSearchDto())
            await this.expander.expandObjects(responseItem, domainSearchDtoKeys, req)
        }
        return responseItem
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
    async journal(@Param('id', ParseIntPipe) id: number, page, row, req): Promise<[JournalResponseDto[], number]> {
        return super.journal(id, page, row, req)
    }

}
