import {ApiCreatedResponse, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Auth} from '../../decorators/auth.decorator'
import {Controller, Delete, Get, Param, ParseIntPipe, Post} from '@nestjs/common'
import {CrudController} from '../../controllers/crud.controller'
import {DomainCreateDto} from './dto/domain-create.dto'
import {DomainResponseDto} from './dto/domain-response.dto'
import {DomainsService} from './domains.service'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {JournalsService} from '../journals/journals.service'
import {RBAC_ROLES} from '../../config/constants.config'
import {Request} from 'express'
import {Roles} from '../../decorators/roles.decorator'

const resourceName = 'domains'

@Auth(
    RBAC_ROLES.admin,
    RBAC_ROLES.reseller,
    RBAC_ROLES.system,
)
@ApiTags('Domains')
@Controller(resourceName)
export class DomainsController extends CrudController<DomainCreateDto, DomainResponseDto> {
    constructor(
        private readonly domainsService: DomainsService,
        private readonly journalsService: JournalsService,
    ) {
        super(resourceName, domainsService, journalsService)
    }

    @Post()
    @ApiCreatedResponse({
        type: DomainResponseDto,
    })
    async create(entity: DomainCreateDto, req: Request): Promise<DomainResponseDto> {
        return super.create(entity, req)
    }

    @Get()
    @Roles(RBAC_ROLES.ccare, RBAC_ROLES.ccareadmin)
    @ApiOkResponse({
        type: [DomainResponseDto],
    })
    async readAll(page, rows): Promise<DomainResponseDto[]> {
        return this.domainsService.readAll(page, rows)
    }

    @Get(':id')
    @ApiOkResponse({
        type: DomainResponseDto,
    })
    @Roles(RBAC_ROLES.ccare, RBAC_ROLES.ccareadmin)
    async read(@Param('id', ParseIntPipe) id: number): Promise<DomainResponseDto> {
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
    async journal(@Param('id', ParseIntPipe) id: number, page, row): Promise<JournalResponseDto[]> {
        return super.journal(id, page, row)
    }

}
