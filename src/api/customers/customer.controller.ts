import {Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put} from '@nestjs/common'
import {CrudController} from '../../controllers/crud.controller'
import {CustomerCreateDto} from './dto/customer-create.dto'
import {CustomerResponseDto} from './dto/customer-response.dto'
import {Operation} from '../../helpers/patch.helper'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {CustomerService} from './customer.service'
import {JournalService} from '../journals/journal.service'
import {Request} from 'express'
import {
    ApiBody,
    ApiConsumes,
    ApiExtraModels,
    ApiOkResponse,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger'
import {Auth} from '../../decorators/auth.decorator'
import {RbacRole} from '../../config/constants.config'
import {number} from 'yargs'
import {PatchDto} from '../../dto/patch.dto'
import {ExpandHelper} from '../../helpers/expand.helper'
import {CustomerSearchDto} from './dto/customer-search.dto'
import {PaginatedDto} from '../../dto/paginated.dto'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {ApiCreatedResponse} from '../../decorators/api-created-response.decorator'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'
import {LoggerService} from '../../logger/logger.service'
import {ServiceRequest} from '../../interfaces/service-request.interface'

const resourceName = 'customers'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
    RbacRole.ccare,
    RbacRole.ccareadmin,
)
@ApiTags('Customer')
@ApiExtraModels(PaginatedDto)
@Controller(resourceName)
export class CustomerController extends CrudController<CustomerCreateDto, CustomerResponseDto> {
    private readonly log = new LoggerService(CustomerController.name)
    constructor(
        private readonly customerService: CustomerService,
        private readonly journalService: JournalService,
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, customerService, journalService)
    }

    @Post()
    @ApiCreatedResponse(CustomerResponseDto)
    async create(entity: CustomerCreateDto[], req: Request): Promise<CustomerResponseDto> {
        this.log.debug({message: 'create customer', func: this.create.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const response = await this.customerService.create(entity[0], sr)
        await this.journalService.writeJournal(sr, response.id, response)
        return response
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(CustomerResponseDto)
    async readAll(req): Promise<[CustomerResponseDto[], number]> {
        this.log.debug({message: 'fetch all customers', func: this.readAll.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const [responseList, totalCount] =
            await this.customerService.readAll(sr)
        if (sr.query.expand) {
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
        this.log.debug({message: 'fetch customer by id', func: this.read.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const responseItem = await this.customerService.read(id, sr)
        if (sr.query.expand && !req.isRedirected) {
            const customerSearchDtoKeys = Object.keys(new CustomerSearchDto())
            await this.expander.expandObjects(responseItem, customerSearchDtoKeys, sr)
        }
        return responseItem
    }

    @Put(':id')
    @ApiOkResponse({
        type: CustomerResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number, dto: CustomerCreateDto, req): Promise<CustomerResponseDto> {
        this.log.debug({message: 'update customer by id', func: this.update.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const response = await this.customerService.update(id, dto, sr)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Patch(':id')
    @ApiConsumes('application/json-patch+json')
    @ApiOkResponse({
        type: CustomerResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(@Param('id', ParseIntPipe) id: number, patch: Operation | Operation[], req): Promise<CustomerResponseDto> {
        this.log.debug({message: 'patch customer by id', func: this.adjust.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const response = await this.customerService.adjust(id, patch, sr)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Delete(':id')
    @ApiOkResponse({
        type: number,
    })
    async delete(@Param('id', ParseIntPipe) id: number, req): Promise<number> {
        this.log.debug({message: 'delete customer by id', func: this.delete.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const response = await this.customerService.delete(id, sr)
        await this.journalService.writeJournal(sr, id, {})
        return response
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, req) {
        this.log.debug({message: 'fetch customer journal by id', func: this.journal.name, url: req.url, method: req.method})
        return super.journal(id, req)
    }
}
