import {ApiBody, ApiConsumes, ApiExtraModels, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Auth} from '../../decorators/auth.decorator'
import {Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Req} from '@nestjs/common'
import {CrudController} from '../../controllers/crud.controller'
import {CustomerSpeedDialCreateDto} from './dto/customer-speed-dial-create.dto'
import {CustomerSpeedDialUpdateDto} from './dto/customer-speed-dial-update.dto'
import {CustomerSpeedDialResponseDto} from './dto/customer-speed-dial-response.dto'
import {CustomerSpeedDialService} from './customer-speed-dial.service'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {JournalService} from '../journals/journal.service'
import {RbacRole} from '../../config/constants.config'
import {PaginatedDto} from '../../dto/paginated.dto'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {ApiCreatedResponse} from '../../decorators/api-created-response.decorator'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'
import {LoggerService} from '../../logger/logger.service'
import {PatchDto} from '../../dto/patch.dto'
import {Operation} from 'helpers/patch.helper'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {Request} from 'express'
import {ParseOneOrManyPipe} from '../../pipes/parse-one-or-many.pipe'
import {number} from 'yargs'
import {ParseIntIdArrayPipe} from '../../pipes/parse-int-id-array.pipe'
import {ParamOrBody} from '../../decorators/param-or-body.decorator'
import {internal} from '../../entities'
import {Dictionary} from '../../helpers/dictionary.helper'

const resourceName = 'customerspeeddials'

@Auth(
    RbacRole.admin,
    RbacRole.reseller,
    RbacRole.system,
    RbacRole.subscriberadmin,
)
@ApiTags('CustomerSpeedDial')
@ApiExtraModels(PaginatedDto)
@Controller(resourceName)
export class CustomerSpeedDialController extends CrudController<CustomerSpeedDialCreateDto, CustomerSpeedDialResponseDto> {
    private readonly log = new LoggerService(CustomerSpeedDialController.name)

    constructor(
        private readonly customerSpeedDialService: CustomerSpeedDialService,
        private readonly journalService: JournalService,
    ) {
        super(resourceName, customerSpeedDialService, journalService)
    }

    @Post()
    @ApiCreatedResponse(CustomerSpeedDialResponseDto)
    @ApiBody({
        type: CustomerSpeedDialCreateDto,
        isArray: true,
    })
    async create(
        @Body(new ParseOneOrManyPipe({items: CustomerSpeedDialCreateDto})) createDto: CustomerSpeedDialCreateDto[],
        @Req() req: Request,
    ): Promise<CustomerSpeedDialResponseDto[]> {
        this.log.debug({
            message: 'create customer speeddials',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const csd = createDto.map(dial => dial.toInternal())
        const created = await this.customerSpeedDialService.createMany(csd, sr)
        return created.map((dial) => new CustomerSpeedDialResponseDto(dial))
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(CustomerSpeedDialResponseDto)
    async readAll(@Req() req): Promise<[CustomerSpeedDialResponseDto[], number]> {
        this.log.debug({
            message: 'read all customer speed dial',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const [csd, totalCount] =
            await this.customerSpeedDialService.readAll(sr)
        const responseList = csd.map(e => new CustomerSpeedDialResponseDto(e))
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: CustomerSpeedDialResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, req): Promise<CustomerSpeedDialResponseDto> {
        this.log.debug({
            message: 'read customer speed dial by id',
            id: id,
            func: this.readAll.name,
            url: req.url,
            method: req.method
        })
        return new CustomerSpeedDialResponseDto(
            await this.customerSpeedDialService.read(id, new ServiceRequest(req)),
        )
    }

    @Put(':id')
    @ApiOkResponse({
        type: CustomerSpeedDialResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number, entity: CustomerSpeedDialUpdateDto, req): Promise<CustomerSpeedDialResponseDto> {
        this.log.debug({
            message: 'update customer speed dial by id',
            id: id,
            func: this.update.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.CustomerSpeedDial>()
        updates[id] = Object.assign(new CustomerSpeedDialCreateDto(), entity).toInternal(id)
        const ids = await this.customerSpeedDialService.update(updates, sr)
        const csd = await this.customerSpeedDialService.read(ids[0], sr)
        const response = new CustomerSpeedDialResponseDto(csd)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Patch(':id')
    @ApiConsumes('application/json-patch+json')
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(@Param('id', ParseIntPipe) id: number, patch: Operation | Operation[], req): Promise<CustomerSpeedDialResponseDto> {
        this.log.debug({
            message: 'patch customer speed dial by id',
            id: id,
            func: this.adjust.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const ids = await this.customerSpeedDialService.adjust(id, patch, sr)
        const csd = await this.customerSpeedDialService.read(ids[0], sr)
        const response = new CustomerSpeedDialResponseDto(csd)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Delete(':id?')
    @ApiOkResponse({
        type: [number]
    })
    async delete(
        @ParamOrBody('id', new ParseIntIdArrayPipe()) ids: number[],
        @Req() req
    ): Promise<number[]> {
        this.log.debug({
            message: 'delete customer speed dial by id',
            id: ids,
            func: this.delete.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const deletedIds = await this.customerSpeedDialService.delete(ids, sr)
        for (const deletedId of deletedIds) {
            await this.journalService.writeJournal(sr, deletedId, {})
        }
        return deletedIds
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, @Req() req) {
        this.log.debug({
            message: 'read customer speed dial journal by id',
            id: id,
            func: this.delete.name,
            url: req.url,
            method: req.method
        })
        return super.journal(id, req)
    }
}
