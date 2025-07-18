import {Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Req} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {Operation, patchToEntity} from 'helpers/patch.helper'
import {Transactional} from 'typeorm-transactional'
import {number} from 'yargs'

import {CustomerSpeedDialService} from './customer-speed-dial.service'
import {CustomerSpeedDialRequestDto} from './dto/customer-speed-dial-request.dto'
import {CustomerSpeedDialResponseDto} from './dto/customer-speed-dial-response.dto'
import {CustomerSpeedDialUpdateDto} from './dto/customer-speed-dial-update.dto'

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
import {Operation as PatchOperation} from '~/helpers/patch.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIdDictionary} from '~/pipes/parse-id-dictionary.pipe'
import {ParseIntIdArrayPipe} from '~/pipes/parse-int-id-array.pipe'
import {ParseOneOrManyPipe} from '~/pipes/parse-one-or-many.pipe'
import {ParsePatchPipe} from '~/pipes/parse-patch.pipe'

const resourceName = 'customerspeeddials'

@Auth(
    RbacRole.admin,
    RbacRole.reseller,
    RbacRole.system,
    RbacRole.subscriberadmin,
)
@ApiTags('CustomerSpeedDial')
@Controller(resourceName)
export class CustomerSpeedDialController extends CrudController<CustomerSpeedDialRequestDto, CustomerSpeedDialResponseDto> {
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
        type: CustomerSpeedDialRequestDto,
        isArray: true,
    })
    @Transactional()
    async create(
        @Body(new ParseOneOrManyPipe({items: CustomerSpeedDialRequestDto})) createDto: CustomerSpeedDialRequestDto[],
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
        const created = await this.customerSpeedDialService.create(csd, sr)
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
            method: req.method,
        })
        return new CustomerSpeedDialResponseDto(
            await this.customerSpeedDialService.read(id, new ServiceRequest(req)),
        )
    }

    @Put(':id')
    @ApiOkResponse({
        type: CustomerSpeedDialResponseDto,
    })
    @Transactional()
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
        updates[id] = Object.assign(new CustomerSpeedDialRequestDto(), entity).toInternal({id: id, assignNulls: true})
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
    @Transactional()
    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ParsePatchPipe()) patch: Operation[],
            req: Request,
    ): Promise<CustomerSpeedDialResponseDto> {
        this.log.debug({
            message: 'patch customer speed dial by id',
            id: id,
            func: this.adjust.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)

        const oldEntity = await this.customerSpeedDialService.read(id, sr)
        const entity = await patchToEntity<internal.CustomerSpeedDial, CustomerSpeedDialRequestDto>(oldEntity, patch, CustomerSpeedDialRequestDto)
        const update = new Dictionary<internal.CustomerSpeedDial>(id.toString(), entity)

        const ids = await this.customerSpeedDialService.update(update, sr)
        const updatedEntity = await this.customerSpeedDialService.read(ids[0], sr)
        const response = new CustomerSpeedDialResponseDto(updatedEntity)
        await this.journalService.writeJournal(sr, id, response)

        return response
    }

    @Patch()
    @ApiConsumes('application/json-patch+json')
    @ApiPutBody(PatchDto)
    @Transactional()
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) patches: Dictionary<PatchOperation[]>,
        @Req() req: Request,
    ): Promise<number[]> {
        const sr = new ServiceRequest(req)

        const updates = new Dictionary<internal.CustomerSpeedDial>()
        for (const id of Object.keys(patches)) {
            const oldEntity = await this.customerSpeedDialService.read(+id, sr)
            const entity = await patchToEntity<internal.CustomerSpeedDial, CustomerSpeedDialRequestDto>(oldEntity, patches[id], CustomerSpeedDialRequestDto)
            updates[id] = entity
        }

        return await this.customerSpeedDialService.update(updates, sr)
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
    async journal(@Param('id') id: number | string, @Req() req): Promise<[JournalResponseDto[], number]>{
        this.log.debug({
            message: 'read customer speed dial journal by id',
            id: id,
            func: this.delete.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }
}
