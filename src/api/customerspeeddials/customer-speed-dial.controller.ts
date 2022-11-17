import {ApiBody, ApiConsumes, ApiCreatedResponse, ApiExtraModels, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Auth} from '../../decorators/auth.decorator'
import {Controller, Delete, forwardRef, Get, Inject, Param, ParseIntPipe, Patch, Post, Put, Req} from '@nestjs/common'
import {CrudController} from '../../controllers/crud.controller'
import {CustomerSpeedDialCreateDto} from './dto/customer-speed-dial-create.dto'
import {CustomerSpeedDialUpdateDto} from './dto/customer-speed-dial-update.dto'
import {CustomerSpeedDialResponseDto} from './dto/customer-speed-dial-response.dto'
import {CustomerSpeedDialService} from './customer-speed-dial.service'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {JournalService} from '../journals/journal.service'
import {RbacRole} from '../../config/constants.config'
import {PaginatedDto} from '../paginated.dto'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'
import {LoggerService} from '../../logger/logger.service'
import {PatchDto} from '../patch.dto'
import {Operation} from 'helpers/patch.helper'

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
    @ApiCreatedResponse({
        type: CustomerSpeedDialResponseDto,
    })
    async create(dto: CustomerSpeedDialCreateDto, req): Promise<CustomerSpeedDialResponseDto> {
        this.log.debug({
            message: 'create customer speed dial',
            func: this.readAll.name,
            url: req.url,
            method: req.method
        })
        const sr = this.newServiceRequest(req)
        const csd = await this.customerSpeedDialService.create(
            Object.assign(new CustomerSpeedDialCreateDto(), dto).toInternal(),
            sr
        )
        const response = new CustomerSpeedDialResponseDto(csd)
        await this.journalService.writeJournal(sr, csd.contract_id, response)
        return response
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(CustomerSpeedDialResponseDto)
    async readAll(@Req() req): Promise<[CustomerSpeedDialResponseDto[], number]> {
        this.log.debug({
            message: 'read all customer speed dial',
            func: this.readAll.name,
            url: req.url,
            method: req.method
        })
        const sr = this.newServiceRequest(req)
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
            await this.customerSpeedDialService.read(id, this.newServiceRequest(req))
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
            method: req.method
        })
        const sr = this.newServiceRequest(req)
        const csd = await this.customerSpeedDialService.update(
            id,
            Object.assign(new CustomerSpeedDialCreateDto(), entity).toInternal(),
            sr
        )
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
            method: req.method
        })
        const sr = this.newServiceRequest(req)
        const csd = await this.customerSpeedDialService.adjust(id, patch, sr)
        const response = new CustomerSpeedDialResponseDto(csd)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Delete(':id')
    @ApiOkResponse({})
    async delete(@Param('id', ParseIntPipe) id: number, req): Promise<number> {
        this.log.debug({
            message: 'delete customer speed dial by id',
            id: id,
            func: this.delete.name,
            url: req.url,
            method: req.method
        })
        const sr = this.newServiceRequest(req)
        const response = await this.customerSpeedDialService.delete(id, sr)
        await this.journalService.writeJournal(sr, id, {})
        return response
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
