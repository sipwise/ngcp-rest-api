import {Controller, Delete, Get, Patch, Post, Put} from '@nestjs/common'
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
    async read(id, req): Promise<CustomercontactResponseDto> {
        return super.read(id, req)
    }

    @Patch(':id')
    @ApiOkResponse({
        type: CustomercontactResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(id: number, patch: Operation | Operation[], req: Request): Promise<CustomercontactResponseDto> {
        return super.adjust(id, patch, req)
    }

    @Put(':id')
    @ApiOkResponse({
        type: CustomercontactResponseDto,
    })
    async update(id, entity: CustomercontactCreateDto, req: Request): Promise<CustomercontactResponseDto> {
        return super.update(id, entity, req)
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
        type: [JournalResponseDto],
    })
    async journal(id, page, row, req): Promise<JournalResponseDto[]> {
        return super.journal(id, page, row, req)
    }

}
