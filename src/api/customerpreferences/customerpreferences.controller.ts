import {Controller, Get, Patch, Put} from '@nestjs/common'
import {ApiBody, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {CrudController} from '../../controllers/crud.controller'
import {CustomerpreferenceCreateDto} from './dto/customerpreference-create.dto'
import {CustomerpreferenceResponseDto} from './dto/customerpreference-response.dto'
import {Operation} from 'fast-json-patch'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {Request} from 'express'
import {PatchDto} from '../patch.dto'
import {Auth} from '../../decorators/auth.decorator'
import {RBAC_ROLES} from '../../config/constants.config'
import {JournalsService} from '../journals/journals.service'
import {CustomerpreferencesService} from './customerpreferences.service'

const resourceName = 'customerpreferences'

@Auth(RBAC_ROLES.system)
@Controller(resourceName)
@ApiTags('Customer preferences')
export class CustomerpreferencesController extends CrudController<CustomerpreferenceCreateDto, CustomerpreferenceResponseDto> {

    constructor(
        private readonly customerpreferenceService: CustomerpreferencesService,
        private readonly journalService: JournalsService,
    ) {
        super(resourceName, customerpreferenceService, journalService)
    }

    @Get()
    @ApiOkResponse({
        type: [CustomerpreferenceResponseDto],
    })
    async readAll(page: number, rows: number): Promise<CustomerpreferenceResponseDto[]> {
        return super.readAll(page, rows)
    }

    @Get(':id')
    @ApiOkResponse({
        type: CustomerpreferenceResponseDto,
    })
    async read(id: number): Promise<CustomerpreferenceResponseDto> {
        return super.read(id)
    }

    @Put(':id')
    @ApiOkResponse({
        type: CustomerpreferenceResponseDto,
    })
    async update(id: number, dto: CustomerpreferenceCreateDto, req: Request): Promise<CustomerpreferenceResponseDto> {
        return super.update(id, dto, req)
    }

    @Patch(':id')
    @ApiOkResponse({
        type: CustomerpreferenceResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(id: number, patch: Operation[], req: Request): Promise<CustomerpreferenceResponseDto> {
        return super.adjust(id, patch, req)
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(id: number, page: number, row: number): Promise<JournalResponseDto[]> {
        return super.journal(id, page, row)
    }
}
