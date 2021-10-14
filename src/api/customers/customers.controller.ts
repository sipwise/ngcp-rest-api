import {Controller, Delete, Get, Patch, Post, Put} from '@nestjs/common'
import {CrudController} from '../../controllers/crud.controller'
import {CustomerCreateDto} from './dto/customer-create.dto'
import {CustomerResponseDto} from './dto/customer-response.dto'
import {Operation} from '../../helpers/patch.helper'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {CustomersService} from './customers.service'
import {JournalsService} from '../journals/journals.service'
import {Request} from 'express'
import {ApiBody, ApiCreatedResponse, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Auth} from '../../decorators/auth.decorator'
import {RBAC_ROLES} from '../../config/constants.config'
import {number} from 'yargs'
import {PatchDto} from '../patch.dto'

const resourceName = 'customers'

@Auth(
    RBAC_ROLES.system,
    RBAC_ROLES.admin,
    RBAC_ROLES.reseller,
    RBAC_ROLES.ccare,
    RBAC_ROLES.ccareadmin,
)
@ApiTags('Customers')
@Controller(resourceName)
export class CustomersController extends CrudController<CustomerCreateDto, CustomerResponseDto> {

    constructor(
        private readonly customerService: CustomersService,
        private readonly journalService: JournalsService,
    ) {
        super(resourceName, customerService, journalService)
    }

    @Post()
    @ApiCreatedResponse({
        type: CustomerResponseDto,
    })
    async create(entity: CustomerCreateDto, req: Request): Promise<CustomerResponseDto> {
        return super.create(entity, req)
    }

    @Get()
    @ApiOkResponse({
        type: [CustomerResponseDto],
    })
    async readAll(page, rows, req): Promise<CustomerResponseDto[]> {
        return super.readAll(page, rows, req)
    }

    @Get(':id')
    @ApiOkResponse({
        type: CustomerResponseDto,
    })
    async read(id, req): Promise<CustomerResponseDto> {
        return super.read(id, req)
    }

    @Put(':id')
    @ApiOkResponse({
        type: CustomerResponseDto,
    })
    async update(id, dto: CustomerCreateDto, req: Request): Promise<CustomerResponseDto> {
        return super.update(id, dto, req)
    }

    @Patch(':id')
    @ApiOkResponse({
        type: CustomerResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(id, patch: Operation | Operation[], req: Request): Promise<CustomerResponseDto> {
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
        type: [JournalResponseDto],
    })
    async journal(id, page, row): Promise<JournalResponseDto[]> {
        return super.journal(id, page, row)
    }
}
