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
import {ExpandHelper} from '../../helpers/expand.helper'
import {CustomerSearchDto} from './dto/customer-search.dto'

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
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, customerService, journalService)
    }

    @Post()
    @ApiCreatedResponse({
        type: CustomerResponseDto,
    })
    async create(entity: CustomerCreateDto, req: Request): Promise<CustomerResponseDto> {
        return this.customerService.create(entity, this.newServiceRequest(req))
    }

    @Get()
    @ApiOkResponse({
        type: [CustomerResponseDto],
    })
    async readAll(req): Promise<[CustomerResponseDto[], number]> {
        const sr = this.newServiceRequest(req)
        const [responseList, totalCount] =
            await this.customerService.readAll(sr)
        if (req.query.expand) {
            const customerSearchDtoKeys = Object.keys(new CustomerSearchDto())
            await this.expander.expandObjects(responseList, customerSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: CustomerResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, req): Promise<CustomerResponseDto> {
        return this.customerService.read(id, this.newServiceRequest(req))
        const responseItem = await this.customerService.read(id, this.newServiceRequest(req))
        if (req.query.expand && !req.isRedirected) {
            const customerSearchDtoKeys = Object.keys(new CustomerSearchDto())
            await this.expander.expandObjects(responseItem, customerSearchDtoKeys, req)
        }
        return responseItem
    }

    @Put(':id')
    @ApiOkResponse({
        type: CustomerResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number, dto: CustomerCreateDto, req): Promise<CustomerResponseDto> {
        return this.customerService.update(id, dto, this.newServiceRequest(req))
    }

    @Patch(':id')
    @ApiOkResponse({
        type: CustomerResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(@Param('id', ParseIntPipe) id: number, patch: Operation | Operation[], req): Promise<CustomerResponseDto> {
        return this.customerService.adjust(id, patch, this.newServiceRequest(req))
    }

    @Delete(':id')
    @ApiOkResponse({
        type: number,
    })
    async delete(@Param('id', ParseIntPipe) id: number, req): Promise<number> {
        return this.customerService.delete(id, this.newServiceRequest(req))
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id', ParseIntPipe) id: number, page, row, req): Promise<[JournalResponseDto[], number]> {
        return super.journal(id, page, row, req)
    }
}
