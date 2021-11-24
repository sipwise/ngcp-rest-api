import {Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put} from '@nestjs/common'
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
    async read(@Param('id', ParseIntPipe) id: number): Promise<CustomerResponseDto> {
        return this.customerService.read(id)
    }

    @Put(':id')
    @ApiOkResponse({
        type: CustomerResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number, dto: CustomerCreateDto): Promise<CustomerResponseDto> {
        return this.customerService.update(id, dto)
    }

    @Patch(':id')
    @ApiOkResponse({
        type: CustomerResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(@Param('id', ParseIntPipe) id: number, patch: Operation | Operation[]): Promise<CustomerResponseDto> {
        return this.customerService.adjust(id, patch)
    }

    @Delete(':id')
    @ApiOkResponse({
        type: number,
    })
    async delete(@Param('id', ParseIntPipe) id: number): Promise<number> {
        return this.customerService.delete(id)
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id', ParseIntPipe) id: number, page, row, req): Promise<JournalResponseDto[]> {
        return super.journal(id, page, row, req)
    }
}
