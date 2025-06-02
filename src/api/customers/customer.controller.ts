import {Body, Controller, Delete, Get, Inject, Param, ParseIntPipe, Post, Query, Req, ValidationPipe, forwardRef} from '@nestjs/common'
import {ApiBody, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {number} from 'yargs'

import {CustomerService} from './customer.service'
import {CustomerQueryDto} from './dto/customer-query.dto'
import {CustomerRequestDto} from './dto/customer-request.dto'
import {CustomerResponseDto} from './dto/customer-response.dto'

import {CustomerBillingProfileResponseDto} from '~/api/customers/dto/customer-billing-profile-response.dto'
import {CustomerSearchDto} from '~/api/customers/dto/customer-search.dto'
import {HeaderManipulationSetSearchDto} from '~/api/header-manipulations/sets/dto/header-manipulation-set-search.dto'
import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiCreatedResponse} from '~/decorators/api-created-response.decorator'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {ParamOrBody} from '~/decorators/param-or-body.decorator'
import {ExpandHelper} from '~/helpers/expand.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIntIdArrayPipe} from '~/pipes/parse-int-id-array.pipe'
import {ParseOneOrManyPipe} from '~/pipes/parse-one-or-many.pipe'

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
            const setSearchDtoKeys = Object.keys(new HeaderManipulationSetSearchDto())
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

    @Delete(':id?')
    @ApiOkResponse({
        type: [number],
    })
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
