import {Body, Controller, Get, Param, ParseIntPipe, Patch, Put, Req, ValidationPipe} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {CustomerBalanceService} from './customer-balance.service'
import {CustomerBalanceRequestParamDto} from './dto/customer-balance-request-param.dto'
import {CustomerBalanceRequestDto} from './dto/customer-balance-request.dto'
import {CustomerBalanceResponseDto} from './dto/customer-balance-response.dto'
import {CustomerBalanceSearchDto} from './dto/customer-balance-search.dto'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {RbacRole} from '~/config/constants.config'
import {License as LicenseType} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {ApiPutBody} from '~/decorators/api-put-body.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {License} from '~/decorators/license.decorator'
import {PatchDto} from '~/dto/patch.dto'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ExpandHelper} from '~/helpers/expand.helper'
import {Operation, Operation as PatchOperation,patchToEntity} from '~/helpers/patch.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIdDictionary} from '~/pipes/parse-id-dictionary.pipe'
import {ParsePatchPipe} from '~/pipes/parse-patch.pipe'

const resourceName = 'customers/'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
    RbacRole.ccareadmin,
    RbacRole.ccare,
)
@ApiTags('Customer')
@Controller(resourceName)
@License(LicenseType.billing)
export class CustomerBalanceController extends CrudController<CustomerBalanceRequestDto, CustomerBalanceResponseDto> {
    private readonly log = new LoggerService(CustomerBalanceController.name)

    constructor(
        private readonly customerBalanceService: CustomerBalanceService,
        private readonly expander: ExpandHelper,
        private readonly journalService: JournalService,
    ) {
        super(resourceName, customerBalanceService)
    }

    @Get(':customerId?/balances')
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(CustomerBalanceResponseDto)
    async readAll(
        @Req() req: Request,
        @Param(new ValidationPipe()) _reqParams: CustomerBalanceRequestParamDto): Promise<[CustomerBalanceResponseDto[], number]> {
        this.log.debug({
            message: 'read all customer balances',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const [entity, totalCount] =
            await this.customerBalanceService.readAll(sr)
        const responseList = entity.map(e => new CustomerBalanceResponseDto(e))
        if (sr.query.expand) {
            await this.expander.expandObjects(responseList, Object.keys(new CustomerBalanceSearchDto()), sr)
        }
        return [responseList, totalCount]
    }

    @Get(':customerId?/balances/:id')
    @ApiOkResponse({
        type: CustomerBalanceResponseDto,
    })
    async read(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request,
        // TODO: _Prefix does not work here, fix?
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        @Param(new ValidationPipe()) {customerId}: CustomerBalanceRequestParamDto = new CustomerBalanceRequestParamDto(),
    ): Promise<CustomerBalanceResponseDto> {
        this.log.debug({
            message: 'read customer balance by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const rule = await this.customerBalanceService.read(id, sr)
        const responseItem = new CustomerBalanceResponseDto(rule)
        if (sr.query.expand) {
            await this.expander.expandObjects([responseItem], Object.keys(new CustomerBalanceSearchDto()), sr)
        }

        return responseItem
    }

    @Put(':customerId?/balances/:id')
    @ApiOkResponse({
        type: CustomerBalanceResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number,
        dto: CustomerBalanceRequestDto,
        @Req() req: Request,
        // TODO: _Prefix does not work here, fix?
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        @Param(new ValidationPipe()) {customerId}: CustomerBalanceRequestParamDto = new CustomerBalanceRequestParamDto(),  
    ): Promise<CustomerBalanceResponseDto> {
        this.log.debug({
            message: 'update customer balance by id',
            id: id,
            func: this.update.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.ContractBalance>()
        updates[id] = Object.assign(new CustomerBalanceRequestDto(), dto).toInternal({id: id, assignNulls: true})
        const ids = await this.customerBalanceService.update(updates, sr)
        const entity = await this.customerBalanceService.read(ids[0], sr)
        const response = new CustomerBalanceResponseDto(entity)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put(':customerId?/balances')
    @ApiPutBody(CustomerBalanceRequestDto)
    async updateMany(
        @Body(new ParseIdDictionary({items: CustomerBalanceRequestDto})) updates: Dictionary<CustomerBalanceRequestDto>,
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({message: 'update customer balances bulk', func: this.updateMany.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const sets = new Dictionary<internal.ContractBalance>()
        for (const id of Object.keys(updates)) {
            const dto: CustomerBalanceRequestDto = updates[id]
            sets[id] = dto.toInternal({id: parseInt(id), assignNulls: true})
        }
        return await this.customerBalanceService.update(sets, sr)
    }

    @Patch(':customerId?/balances/:id')
    @ApiConsumes('application/json-patch+json')
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ParsePatchPipe()) patch: Operation[],
        @Req() req: Request,
    ): Promise<CustomerBalanceResponseDto> {
        this.log.debug({
            message: 'patch customer balance by id',
            id: id,
            func: this.adjust.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)

        const oldEntity = await this.customerBalanceService.read(id, sr)
        const entity = await patchToEntity<internal.ContractBalance, CustomerBalanceRequestDto>(oldEntity, patch, CustomerBalanceRequestDto)
        const update = new Dictionary<internal.ContractBalance>(id.toString(), entity)

        const ids = await this.customerBalanceService.update(update, sr)
        const updatedEntity = await this.customerBalanceService.read(ids[0], sr)
        const response = new CustomerBalanceResponseDto(updatedEntity)
        await this.journalService.writeJournal(sr, id, response)

        return response
    }

    @Patch(':customerId?/balances')
    @ApiConsumes('application/json-patch+json')
    @ApiPutBody(PatchDto)
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) patches: Dictionary<PatchOperation[]>,
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({
            message: 'patch customer balances bulk',
            func: this.adjustMany.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.ContractBalance>()
        for (const id of Object.keys(patches)) {
            const oldEntity = await this.customerBalanceService.read(+id, sr)
            const entity = await patchToEntity<internal.ContractBalance, CustomerBalanceRequestDto>(oldEntity, patches[id], CustomerBalanceRequestDto)
            updates[id] = entity
        }

        return await this.customerBalanceService.update(updates, sr)
    }

    @Get(':customerId?/balances/:id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, @Req() req: Request): Promise<[JournalResponseDto[], number]> {
        this.log.debug({
            message: 'read customer balance journal by id',
            id: id,
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }
}
