import {Body, Controller, Delete, Get, Inject, Param, ParseIntPipe, Patch, Post, Put, Query, Req, ValidationPipe, forwardRef} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiQuery,ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {Transactional} from 'typeorm-transactional'
import {number} from 'yargs'

import {CustomerService} from './customer.service'
import {CustomerBillingProfileResponseDto} from './dto/customer-billing-profile-response.dto'
import {CustomerQueryDto} from './dto/customer-query.dto'
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
import {ParamOrBody} from '~/decorators/param-or-body.decorator'
import {PatchDto} from '~/dto/patch.dto'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ExpandHelper} from '~/helpers/expand.helper'
import {Operation, patchToEntity} from '~/helpers/patch.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIdDictionary} from '~/pipes/parse-id-dictionary.pipe'
import {ParseIntIdArrayPipe} from '~/pipes/parse-int-id-array.pipe'
import {ParseOneOrManyPipe} from '~/pipes/parse-one-or-many.pipe'
import {ParsePatchPipe} from '~/pipes/parse-patch.pipe'

const resourceName = 'customers'

@Auth(
    RbacRole.system,
    RbacRole.lintercept,
    RbacRole.admin,
    RbacRole.reseller,
    RbacRole.ccareadmin,
    RbacRole.ccare,
)
@ApiTags('Customer')
@Controller(resourceName)
export class CustomerController extends CrudController<CustomerRequestDto, CustomerResponseDto> {
    private readonly log = new LoggerService(CustomerController.name)

    constructor(
        private readonly customerService: CustomerService,
        private readonly journalService: JournalService,
        @Inject(forwardRef(() => ExpandHelper)) private readonly expander: ExpandHelper,
    ) {
        super(resourceName, customerService)
    }

    /* Customer billing profiles */

    @Get(':id/@billing-profiles')
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(CustomerBillingProfileResponseDto)
    async readAllBillingProfiles(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request,
    ): Promise<[CustomerBillingProfileResponseDto[], number]> {
        this.log.debug({
            message: 'read customer billing profiles by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })

        const [entity, totalCount] =
            await this.customerService.readAllBillingProfiles(id, new ServiceRequest(req))
        const responseList = entity.map(e => new CustomerBillingProfileResponseDto(e))
        return [responseList, totalCount]
    }

    @Get(':id/@future-billing-profiles')
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(CustomerBillingProfileResponseDto)
    async readFutureBillingProfiles(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request,
    ): Promise<[CustomerBillingProfileResponseDto[], number]> {
        this.log.debug({
            message: 'read customer billing profiles by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })

        const [entity, totalCount] =
            await this.customerService.readFutureBillingProfiles(id, new ServiceRequest(req))
        const responseList = entity.map(e => new CustomerBillingProfileResponseDto(e))
        return [responseList, totalCount]
    }

    /* Customers */

    @Post()
    @ApiCreatedResponse(CustomerResponseDto)
    @ApiBody({
        type: CustomerRequestDto,
        isArray: true,
    })
    @Transactional()
    async create(
        @Body(new ParseOneOrManyPipe({items: CustomerRequestDto})) createDto: CustomerRequestDto[],
        @Req() req: Request,
    ): Promise<CustomerResponseDto[]> {
        this.log.debug({
            message: 'create customer bulk',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const customers = await Promise.all(createDto.map(async customer => customer.toInternal()))
        const created = await this.customerService.create(customers, sr)
        return await Promise.all(created.map(async customer => new CustomerResponseDto(
            customer,
        )))
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(CustomerResponseDto)
    async readAll(
        @Req() req: Request,
        @Query(new ValidationPipe()) _query: CustomerQueryDto,
    ): Promise<[CustomerResponseDto[], number]> {
        this.log.debug({
            message: 'read all customers',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const [entity, totalCount] =
            await this.customerService.readAll(sr)
        const responseList = entity.map(e => new CustomerResponseDto(e,{url: req.url}))
        if (sr.query.expand) {
            const setSearchDtoKeys = Object.keys(new CustomerSearchDto())
            await this.expander.expandObjects(responseList, setSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: CustomerResponseDto,
    })
    async read(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request,
        @Query(new ValidationPipe()) _query: CustomerQueryDto,
    ): Promise<CustomerResponseDto> {
        this.log.debug({
            message: 'read customer by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const response = new CustomerResponseDto(
            await this.customerService.read(id, sr),
            {url: req.url, containsResourceId: true},
        )
        if (sr.query.expand && !sr.isInternalRedirect) {
            const customerSearchDtoKeys = Object.keys(new CustomerSearchDto())
            await this.expander.expandObjects([response], customerSearchDtoKeys, sr)
        }
        return response
    }

    @Put(':id')
    @ApiOkResponse({type: CustomerResponseDto})
    @Transactional()
    async update(
        @Param('id', ParseIntPipe) id: number,
            dto: CustomerRequestDto,
        @Req() req: Request,
    ): Promise<CustomerResponseDto> {
        this.log.debug({
            message: 'update customer by id',
            id: id,
            func: this.update.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.Customer>()
        updates[id] = Object.assign(new CustomerRequestDto(), dto).toInternal({id: id, assignNulls: true})
        const ids = await this.customerService.update(updates, sr)
        const entity = await this.customerService.read(ids[0], sr)
        const response = new CustomerResponseDto(entity, {url: req.url, containsResourceId: true})
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put()
    @ApiPutBody(CustomerRequestDto)
    @Transactional()
    async updateMany(
        @Body(new ParseIdDictionary({items: CustomerRequestDto})) updates: Dictionary<CustomerRequestDto>,
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({message: 'update customers bulk', func: this.updateMany.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const sets = new Dictionary<internal.Customer>()
        for (const id of Object.keys(updates)) {
            const dto: CustomerRequestDto = updates[id]
            sets[id] = Object.assign(new CustomerRequestDto(), dto).toInternal({id: parseInt(id), assignNulls: true})
        }
        return await this.customerService.update(sets, sr)
    }

    @Patch(':id')
    @ApiConsumes('application/json-patch+json')
    @ApiBody({type: [PatchDto]})
    @Transactional()
    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ParsePatchPipe()) patch: Operation[],
        @Req() req: Request,
    ): Promise<CustomerResponseDto> {
        this.log.debug({
            message: 'patch customer by id',
            id: id,
            func: this.adjust.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const oldEntity = await this.customerService.read(id, sr)
        const entity = await patchToEntity<internal.Customer, CustomerRequestDto>(oldEntity, patch, CustomerRequestDto)
        const updates = new Dictionary<internal.Customer>()
        updates[id] = entity
        const ids = await this.customerService.update(updates, sr)
        const updatedEntity = await this.customerService.read(ids[0], sr)
        const response = new CustomerResponseDto(updatedEntity)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Patch()
    @ApiConsumes('application/json-patch+json')
    @ApiBody({type: PatchDto})
    @Transactional()
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) patches: Dictionary<Operation[]>,
        @Req() req: Request,
    ): Promise<number[]> {
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.Customer>()
        for (const id of Object.keys(patches)) {
            const oldEntity = await this.customerService.read(+id, sr)
            const entity = await patchToEntity<internal.Customer, CustomerRequestDto>(oldEntity, patches[id], CustomerRequestDto)
            updates[id] = entity
        }
        return await this.customerService.update(updates, sr)
    }

    @Delete(':id?')
    @ApiOkResponse({
        type: [number],
    })
    @Transactional()
    async delete(
        @ParamOrBody('id', new ParseIntIdArrayPipe()) ids: number[],
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({
            message: 'delete customer by id',
            id: ids,
            func: this.delete.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const deletedIds = await this.customerService.terminate(ids, sr)
        for (const deletedId of deletedIds) {
            await this.journalService.writeJournal(sr, deletedId, {})
        }
        return deletedIds
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, @Req() req: Request): Promise<[JournalResponseDto[], number]> {
        this.log.debug({
            message: 'read customer journal by id',
            id: id,
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }
}
