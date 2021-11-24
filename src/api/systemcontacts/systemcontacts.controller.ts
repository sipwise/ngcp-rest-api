import {Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put} from '@nestjs/common'
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

const resourceName = 'systemcontacts'

@ApiTags('System Contacts')
@Controller(resourceName)
@Auth(RBAC_ROLES.system, RBAC_ROLES.admin)
export class SystemcontactsController extends CrudController<SystemcontactCreateDto, SystemcontactResponseDto> {
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
    async readAll(page, rows, req): Promise<SystemcontactResponseDto[]> {
        return super.readAll(page, rows, req)
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
    async journal(@Param('id', ParseIntPipe) id: number, page, row): Promise<JournalResponseDto[]> {
        return super.journal(id, page, row)
    }
}
