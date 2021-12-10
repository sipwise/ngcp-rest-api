import {Controller, DefaultValuePipe, Delete, Get, Logger, Param, ParseIntPipe, Patch, Post, Put, Query, Req} from '@nestjs/common'
import {ApiBody, ApiCreatedResponse, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {CrudController} from '../../controllers/crud.controller'
import {JournalsService} from '../journals/journals.service'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {SystemcontactResponseDto} from './dto/systemcontact-response.dto'
import {SystemcontactCreateDto} from './dto/systemcontact-create.dto'
import {SystemcontactsService} from './systemcontacts.service'
import {Request} from 'express'
import {Auth} from '../../decorators/auth.decorator'
import {RBAC_ROLES} from '../../config/constants.config'
import {Operation} from '../../helpers/patch.helper'
import {PatchDto} from '../patch.dto'
import {number} from 'yargs'
import {AppService} from '../../app.service'
import {ServiceRequest} from '../../interfaces/service-request.interface'

const resourceName = 'systemcontacts'

@ApiTags('System Contacts')
@Controller(resourceName)
@Auth(RBAC_ROLES.system, RBAC_ROLES.admin)
export class SystemcontactsController extends CrudController<SystemcontactCreateDto, SystemcontactResponseDto> {
    private readonly log = new Logger(SystemcontactsController.name)

    constructor(
        private readonly contactsService: SystemcontactsService,
        private readonly journalsService: JournalsService,
    ) {
        super(resourceName, contactsService, journalsService)
    }

    @Post()
    @ApiCreatedResponse({
        type: SystemcontactResponseDto,
    })
    async create(entity: SystemcontactCreateDto, req: Request): Promise<SystemcontactResponseDto> {
        return super.create(entity, req)
    }

    @Get()
    @ApiOkResponse({
        type: SystemcontactResponseDto,
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
    ): Promise<SystemcontactResponseDto[]> {
        this.log.debug({message: 'fetch all system contacts', func: this.readAll.name, url: req.url, method: req.method})
        const sr: ServiceRequest = {
            headers: [req.rawHeaders], params: [req.params], user: req.user, query: req.query
        }
        return this.contactsService.readAll(page, rows, sr)
    }

    @Get(':id')
    @ApiOkResponse({
        type: SystemcontactResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number): Promise<SystemcontactResponseDto> {
        return this.contactsService.read(id)
    }

    @Put(':id')
    @ApiOkResponse({
        type: SystemcontactResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number, entity: SystemcontactCreateDto, req: Request): Promise<SystemcontactResponseDto> {
        return super.update(id, entity, req)
    }

    @Patch(':id')
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(@Param('id', ParseIntPipe) id: number, patch: Operation | Operation[], req: Request): Promise<SystemcontactResponseDto> {
        return super.adjust(id, patch, req)
    }

    @Delete(':id')
    @ApiOkResponse({
        type: number,
    })
    async delete(@Param('id', ParseIntPipe) id: number): Promise<number> {
        return this.contactsService.delete(id)
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id', ParseIntPipe) id: number, page, row, req): Promise<JournalResponseDto[]> {
        return super.journal(id, page, row, req)
    }
}
