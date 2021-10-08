import {Controller, Delete, Get, Patch, Post, Put} from '@nestjs/common'
import {ApiBody, ApiCreatedResponse, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Auth} from '../../decorators/auth.decorator'
import {RBAC_ROLES} from '../../config/constants.config'
import {CrudController} from '../../controllers/crud.controller'
import {EmailtemplateCreateDto} from './dto/emailtemplate-create.dto'
import {EmailtemplateResponseDto} from './dto/emailtemplate-response.dto'
import {Operation} from 'fast-json-patch'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {Request} from 'express'
import {JournalsService} from '../journals/journals.service'
import {EmailtemplatesService} from './emailtemplates.service'
import {number} from 'yargs'
import {PatchDto} from '../patch.dto'

const resourceName = 'emailtemplates'

@Auth(RBAC_ROLES.system)
@Controller(resourceName)
@ApiTags('Email templates')
export class EmailtemplatesController extends CrudController<EmailtemplateCreateDto, EmailtemplateResponseDto> {

    constructor(
        private readonly emailtemplateService: EmailtemplatesService,
        private readonly journalService: JournalsService,
    ) {
        super(resourceName, emailtemplateService, journalService)
    }

    @Post()
    @ApiCreatedResponse({
        type: EmailtemplateResponseDto,
    })
    async create(entity: EmailtemplateCreateDto, req: Request): Promise<EmailtemplateResponseDto> {
        return super.create(entity, req)
    }

    @Get()
    @ApiOkResponse({
        type: [EmailtemplateResponseDto],
    })
    async readAll(page, rows, req): Promise<EmailtemplateResponseDto[]> {
        return super.readAll(page, rows, req)
    }

    @Get(':id')
    @ApiOkResponse({
        type: EmailtemplateResponseDto,
    })
    async read(id, req): Promise<EmailtemplateResponseDto> {
        return super.read(id, req)
    }

    @Put(':id')
    @ApiOkResponse({
        type: EmailtemplateResponseDto,
    })
    async update(id: number, dto: EmailtemplateCreateDto, req: Request): Promise<EmailtemplateResponseDto> {
        return super.update(id, dto, req)
    }

    @Patch(':id')
    @ApiOkResponse({
        type: EmailtemplateResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(id: number, patch: Operation[], req: Request): Promise<EmailtemplateResponseDto> {
        return super.adjust(id, patch, req)
    }

    @Delete(':id')
    @ApiOkResponse({
        type: number,
    })
    async delete(id, req): Promise<number> {
        return super.delete(id, req)
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: JournalResponseDto,
    })
    async journal(id: number, page: number, row: number): Promise<JournalResponseDto[]> {
        return super.journal(id, page, row)
    }
}
