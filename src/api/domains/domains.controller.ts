import {ApiBody, ApiCreatedResponse, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Auth} from '../../decorators/auth.decorator'
import {Controller, Delete, Get, Patch, Post, Put} from '@nestjs/common'
import {CrudController} from '../../controllers/crud.controller'
import {DomainCreateDto} from './dto/domain-create.dto'
import {DomainResponseDto} from './dto/domain-response.dto'
import {DomainsService} from './domains.service'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {JournalsService} from '../journals/journals.service'
import {RBAC_ROLES} from '../../config/constants.config'
import {Request} from 'express'
import {Operation} from 'fast-json-patch'
import {PatchDto} from '../patch.dto'

const resourceName = 'domains'

@Auth(
    RBAC_ROLES.admin,
    RBAC_ROLES.ccare,
    RBAC_ROLES.ccareadmin,
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
    @ApiOkResponse({
        type: [DomainResponseDto],
    })
    async readAll(page, rows): Promise<DomainResponseDto[]> {
        return super.readAll(page, rows)
    }

    @Get(':id')
    @ApiOkResponse({
        type: DomainResponseDto,
    })
    async read(id): Promise<DomainResponseDto> {
        return super.read(id)
    }

    @Patch(':id')
    @ApiOkResponse({
        type: DomainResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(id: number, patch: Operation[], req: Request): Promise<DomainResponseDto> {
        return super.adjust(id, patch, req)
    }

    @Put('id')
    @ApiOkResponse({
        type: DomainResponseDto,
    })
    async update(id, entity: DomainCreateDto, req: Request): Promise<DomainResponseDto> {
        return super.update(id, entity, req)
    }

    @Delete(':id')
    @ApiOkResponse({})
    async delete(id): Promise<number> {
        return super.delete(id)
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(id, page, row): Promise<JournalResponseDto[]> {
        return super.journal(id, page, row)
    }

}
