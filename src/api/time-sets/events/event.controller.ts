import {Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Req, UploadedFile, UseInterceptors} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiParam, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {TimeSetEventRequestDto} from './dto/event-request.dto'
import {TimeSetEventResponseDto} from './dto/event-response.dto'
import {TimeSetEventSearchDto} from './dto/event-search.dto'
import {TimeSetEventService} from './event.service'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {ApiJsonOrCalendarBody} from '~/api/time-sets/time-set-calendar.swagger'
import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiContentTypeHeader} from '~/decorators/api-content-type-header.decorator'
import {ApiCreatedResponse} from '~/decorators/api-created-response.decorator'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {ApiPutBody} from '~/decorators/api-put-body.decorator'
import {ApiSearchQuery} from '~/decorators/api-search-query.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {BodyOrEmptyArray} from '~/decorators/body-or-empty-array.decorator'
import {ParamOrBody} from '~/decorators/param-or-body.decorator'
import {Transactional} from '~/decorators/transactional.decorator'
import {PatchDto} from '~/dto/patch.dto'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {Operation, patchManyToEntities, patchToEntity} from '~/helpers/patch.helper'
import {writeFileLimit} from '~/helpers/request-limits.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {calendarToDtos} from '~/helpers/time-set-calendar.helper'
import {mapYield} from '~/helpers/yield.helper'
import {FileUploadInterceptor} from '~/interceptors/file-upload.interceptor'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIdDictionary} from '~/pipes/parse-id-dictionary.pipe'
import {ParseIntIdArrayPipe} from '~/pipes/parse-int-id-array.pipe'
import {ParseIntIdPipe} from '~/pipes/parse-int-id.pipe'
import {ParseOneOrManyPipe} from '~/pipes/parse-one-or-many.pipe'
import {ParsePatchPipe} from '~/pipes/parse-patch.pipe'

const resourceName = 'time-sets'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
)
@ApiTags('TimeSet')
@Controller(resourceName)
export class TimeSetEventController extends CrudController<TimeSetEventRequestDto, TimeSetEventResponseDto> {
    private readonly log = new LoggerService(TimeSetEventController.name)

    constructor(
        private readonly eventService: TimeSetEventService,
        private readonly journalService: JournalService,
    ) {
        super(resourceName, eventService, journalService)
    }

    @Post('{:timeSetId/}events')
    @ApiParam({name: 'timeSetId', required: false, type: Number})
    @ApiCreatedResponse(TimeSetEventResponseDto)
    @ApiJsonOrCalendarBody(TimeSetEventRequestDto)
    @UseInterceptors(FileUploadInterceptor('file', writeFileLimit()))
    @ApiContentTypeHeader('application/json', 'multipart/form-data')
    @Transactional()
    async create(
        @BodyOrEmptyArray(new ParseOneOrManyPipe({items: TimeSetEventRequestDto})) createDto: TimeSetEventRequestDto[],
        @Req() req: Request,
        @UploadedFile() file?: Express.Multer.File,
    ): Promise<TimeSetEventResponseDto[]> {
        this.log.debug({
            message: 'create time set event bulk',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const parentId = sr.params['timeSetId'] ? +sr.params['timeSetId'] : undefined
        if (file)
            createDto = await calendarToDtos(file, TimeSetEventRequestDto)
        const events = await mapYield(createDto, dto => dto.toInternal({parentId}))
        const created = await this.eventService.create(events, sr)
        const response = await mapYield(created, event => new TimeSetEventResponseDto(event))
        await this.journalService.writeJournals(sr, response.map(entry => ({id: entry.id, data: entry})))
        return response
    }

    @Get('{:timeSetId/}events')
    @ApiParam({name: 'timeSetId', required: false, type: Number})
    @ApiSearchQuery(SearchLogic, TimeSetEventSearchDto)
    @ApiPaginatedResponse(TimeSetEventResponseDto)
    async readAll(
        @Req() req: Request,
        @Param('timeSetId', new ParseIntIdPipe({allowUndefined: true})) _timeSetId: number,
    ): Promise<[TimeSetEventResponseDto[], number]> {
        this.log.debug({
            message: 'read all time set events',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const [events, totalCount] = await this.eventService.readAll(new ServiceRequest(req))
        return [events.map(event => new TimeSetEventResponseDto(event)), totalCount]
    }

    @Get('{:timeSetId/}events/:id')
    @ApiParam({name: 'timeSetId', required: false, type: Number})
    @ApiOkResponse({
        type: TimeSetEventResponseDto,
    })
    async read(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request,
        @Param('timeSetId', new ParseIntIdPipe({allowUndefined: true})) _timeSetId: number,
    ): Promise<TimeSetEventResponseDto> {
        this.log.debug({
            message: 'read time set event by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        return new TimeSetEventResponseDto(await this.eventService.read(id, new ServiceRequest(req)))
    }

    @Put('{:timeSetId/}events/:id')
    @ApiParam({name: 'timeSetId', required: false, type: Number})
    @ApiOkResponse({
        type: TimeSetEventResponseDto,
    })
    @Transactional()
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: TimeSetEventRequestDto,
        @Req() req: Request,
        @Param('timeSetId', new ParseIntIdPipe({allowUndefined: true})) _timeSetId: number,
    ): Promise<TimeSetEventResponseDto> {
        this.log.debug({
            message: 'update time set event by id',
            id: id,
            func: this.update.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.TimeSetEvent>(id.toString(), dto.toInternal({id, assignNulls: true}))
        await this.eventService.update(updates, sr)
        const response = new TimeSetEventResponseDto(await this.eventService.read(id, sr))
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put('{:timeSetId/}events')
    @ApiParam({name: 'timeSetId', required: false, type: Number})
    @ApiPutBody(TimeSetEventRequestDto)
    @Transactional()
    async updateMany(
        @Body(new ParseIdDictionary({items: TimeSetEventRequestDto})) updates: Dictionary<TimeSetEventRequestDto>,
        @Req() req: Request,
        @Param('timeSetId', new ParseIntIdPipe({allowUndefined: true})) _timeSetId: number,
    ): Promise<number[]> {
        this.log.debug({message: 'update time set events bulk', func: this.updateMany.name, url: req.url, method: req.method})
        const events = new Dictionary<internal.TimeSetEvent>()
        for (const id of Object.keys(updates))
            events[id] = updates[id].toInternal({id: parseInt(id), assignNulls: true})
        return await this.eventService.update(events, new ServiceRequest(req))
    }

    @Patch('{:timeSetId/}events/:id')
    @ApiParam({name: 'timeSetId', required: false, type: Number})
    @ApiConsumes('application/json-patch+json')
    @ApiBody({
        type: [PatchDto],
    })
    @Transactional()
    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ParsePatchPipe()) patch: Operation[],
        @Req() req: Request,
        @Param('timeSetId', new ParseIntIdPipe({allowUndefined: true})) _timeSetId: number,
    ): Promise<TimeSetEventResponseDto> {
        this.log.debug({
            message: 'patch time set event by id',
            id: id,
            func: this.adjust.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const oldEntity = await this.eventService.read(id, sr)
        const entity = await patchToEntity<internal.TimeSetEvent, TimeSetEventRequestDto>(oldEntity, patch, TimeSetEventRequestDto)
        await this.eventService.update(new Dictionary<internal.TimeSetEvent>(id.toString(), entity), sr)
        const response = new TimeSetEventResponseDto(await this.eventService.read(id, sr))
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Patch('{:timeSetId/}events')
    @ApiParam({name: 'timeSetId', required: false, type: Number})
    @ApiConsumes('application/json-patch+json')
    @ApiPutBody(PatchDto)
    @Transactional()
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) patches: Dictionary<Operation[]>,
        @Req() req: Request,
        @Param('timeSetId', new ParseIntIdPipe({allowUndefined: true})) _timeSetId: number,
    ): Promise<number[]> {
        this.log.debug({
            message: 'patch time set events bulk',
            func: this.adjustMany.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = await patchManyToEntities<internal.TimeSetEvent, TimeSetEventRequestDto>(patches, id => this.eventService.read(id, sr), TimeSetEventRequestDto)
        return await this.eventService.update(updates, sr)
    }

    @Delete('{:timeSetId/}events{/:id}')
    @ApiParam({name: 'timeSetId', required: false, type: Number})
    @ApiOkResponse({
        type: [Number],
    })
    @Transactional()
    async delete(
        @ParamOrBody('id', new ParseIntIdArrayPipe()) ids: number[],
        @Req() req: Request,
        @Param('timeSetId', new ParseIntIdPipe({allowUndefined: true})) _timeSetId: number,
    ): Promise<number[]> {
        this.log.debug({
            message: 'delete time set event by id',
            id: ids,
            func: this.delete.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const deletedIds = await this.eventService.delete(ids, sr)
        await this.journalService.writeJournals(sr, deletedIds.map(id => ({id, data: {}})))
        return deletedIds
    }

    @Get('{:timeSetId/}events/:id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, @Req() req: Request): Promise<[JournalResponseDto[], number]> {
        this.log.debug({
            message: 'read time set event journal by id',
            id: id,
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }
}
