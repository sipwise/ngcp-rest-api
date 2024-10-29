import {Body, Controller, Get, Inject, Param, ParseIntPipe, Patch, Post, Put, Req, forwardRef} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {CustomerService} from './customer.service'
import {CustomerRequestDto} from './dto/customer-request.dto'
import {CustomerResponseDto} from './dto/customer-response.dto'
import {CustomerSearchDto} from './dto/customer-search.dto'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiCreatedResponse} from '~/decorators/api-created-response.decorator'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {ApiPutBody} from '~/decorators/api-put-body.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {PatchDto} from '~/dto/patch.dto'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ExpandHelper} from '~/helpers/expand.helper'
import {Operation,Operation as PatchOperation, patchToEntity} from '~/helpers/patch.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIdDictionary} from '~/pipes/parse-id-dictionary.pipe'
import {ParseOneOrManyPipe} from '~/pipes/parse-one-or-many.pipe'
import {ParsePatchPipe} from '~/pipes/parse-patch.pipe'

const resourceName = 'customers'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
    RbacRole.ccare,
    RbacRole.ccareadmin,
)
@ApiTags('Customer')
@Controller(resourceName)
export class CustomerController extends CrudController<CustomerRequestDto, CustomerResponseDto> {
    private readonly log = new LoggerService(CustomerController.name)

    constructor(
        private readonly customerService: CustomerService,
        private readonly journalService: JournalService,
        @Inject(forwardRef(() => ExpandHelper))
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, customerService, journalService)
    }

    @Post()
    @ApiCreatedResponse(CustomerResponseDto)
    @ApiBody({
        type: CustomerRequestDto,
        isArray: true,
    })
    async create(
        @Body(new ParseOneOrManyPipe({items: CustomerRequestDto})) createDto: CustomerRequestDto[],
        @Req() req: Request,
    ): Promise<CustomerResponseDto[]> {
        this.log.debug({
            message: 'create customers',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const customers = createDto.map(customer => customer.toInternal())
        const created = await this.customerService.create(customers, sr)
        return created.map((customer) => new CustomerResponseDto(customer))
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(CustomerResponseDto)
    async readAll(req): Promise<[CustomerResponseDto[], number]> {
        this.log.debug({message: 'fetch all customers', func: this.readAll.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const [customers, totalCount] =
            await this.customerService.readAll(sr)
        const responseList = customers.map(customer => new CustomerResponseDto(customer))
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
        this.log.debug({message: 'fetch customer by id', func: this.read.name, url: req.url, method: req.method})
        const customer = await this.customerService.read(id, new ServiceRequest(req))
        const response = new CustomerResponseDto(customer)
        if (req.query.expand && !req.isRedirected) {
            const customerSearchDtoKeys = Object.keys(new CustomerSearchDto())
            await this.expander.expandObjects([response], customerSearchDtoKeys, req)
        }
        return response
    }

    @Put(':id')
    @ApiOkResponse({
        type: CustomerResponseDto,
    })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() update: CustomerRequestDto,
        @Req() req,
    ): Promise<CustomerResponseDto> {
        this.log.debug({message: 'update customer by id', func: this.update.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.Customer>()
        updates[id] = update.toInternal({id: id, assignNulls: true})
        await this.customerService.update(updates, sr)

        const response = new CustomerResponseDto(await this.customerService.read(id, sr))
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put()
    @ApiPutBody(CustomerRequestDto)
    async updateMany(
        @Body(new ParseIdDictionary({items: CustomerRequestDto})) updates: Dictionary<CustomerRequestDto>,
        @Req() req,
    ): Promise<number[]> {
        this.log.debug({message: 'update customers bulk', func: this.updateMany.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const customers = new Dictionary<internal.Customer>()
        for (const id of Object.keys(updates)) {
            const dto: CustomerRequestDto = updates[id]
            customers[id] = dto.toInternal({id: parseInt(id), assignNulls: true})
        }
        return await this.customerService.update(customers, sr)
    }

    @Patch(':id')
    @ApiConsumes('application/json-patch+json')
    @ApiOkResponse({
        type: CustomerResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ParsePatchPipe()) patch: Operation[],
        @Req() req,
    ): Promise<CustomerResponseDto> {
        this.log.debug({message: 'patch customer by id', func: this.adjust.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)

        const oldEntity = await this.customerService.read(id, sr)
        const entity = await patchToEntity(oldEntity, patch, CustomerRequestDto)
        const update = new Dictionary<internal.Customer>(id.toString(), entity)

        const ids = await this.customerService.update(update, sr)
        const response = new CustomerResponseDto(await this.customerService.read(ids[0], sr))
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Patch()
    @ApiConsumes('application/json-patch+json')
    @ApiPutBody(PatchDto)
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) patches: Dictionary<PatchOperation[]>,
        @Req() req,
    ): Promise<number[]> {
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.Customer>()

        for (const id of Object.keys(patches)) {
            const oldEntity = await this.customerService.read(+id, sr)
            updates[id] = await patchToEntity(oldEntity, patches[id], CustomerRequestDto)
        }
        return await this.customerService.update(updates, sr)
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, req): Promise<[JournalResponseDto[], number]> {
        this.log.debug({
            message: 'fetch customer journal by id',
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }
}
