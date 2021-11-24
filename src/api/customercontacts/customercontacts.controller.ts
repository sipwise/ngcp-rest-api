import {Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put} from '@nestjs/common'
import {ApiBody, ApiCreatedResponse, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {CustomercontactsService} from './customercontacts.service'
import {CustomercontactCreateDto} from './dto/customercontact-create.dto'
import {CrudController} from '../../controllers/crud.controller'
import {CustomercontactResponseDto} from './dto/customercontact-response.dto'
import {JournalsService} from '../journals/journals.service'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {Request} from 'express'
import {Auth} from '../../decorators/auth.decorator'
import {RBAC_ROLES} from '../../config/constants.config'
import {number} from 'yargs'
import {Operation} from '../../helpers/patch.helper'
import {PatchDto} from '../patch.dto'

const resourceName = 'customercontacts'

@Auth(RBAC_ROLES.system, RBAC_ROLES.admin, RBAC_ROLES.ccare, RBAC_ROLES.ccareadmin, RBAC_ROLES.reseller)
@ApiTags('Customer Contacts')
@Controller(resourceName)
export class CustomercontactsController extends CrudController<CustomercontactCreateDto, CustomercontactResponseDto> {
    constructor(
        private readonly contactsService: CustomercontactsService,
        private readonly journalsService: JournalsService,
    ) {
        super(resourceName, contactsService, journalsService)
    }

    @Post()
    @ApiCreatedResponse({
        type: CustomercontactResponseDto,
    })
    async create(entity: CustomercontactCreateDto, req: Request): Promise<CustomercontactResponseDto> {
        return super.create(entity, req)
    }

    @Get()
    @ApiOkResponse({
        type: [CustomercontactResponseDto],
    })
    async readAll(page, rows, req): Promise<CustomercontactResponseDto[]> {
        return super.readAll(page, rows, req)
    }

    @Get(':id')
    @ApiOkResponse({
        type: CustomercontactResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number): Promise<CustomercontactResponseDto> {
        return this.contactsService.read(id)
    }

    @Patch(':id')
    @ApiOkResponse({
        type: CustomercontactResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(@Param('id', ParseIntPipe) id: number, patch: Operation | Operation[]): Promise<CustomercontactResponseDto> {
        return this.contactsService.adjust(id, patch)
    }

    @Put(':id')
    @ApiOkResponse({
        type: CustomercontactResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number, entity: CustomercontactCreateDto): Promise<CustomercontactResponseDto> {
        return this.contactsService.update(id, entity)
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
