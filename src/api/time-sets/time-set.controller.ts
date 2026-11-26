import {Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Req, Response, StreamableFile, UploadedFile, UseInterceptors} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Request, Response as ExpressResponse} from 'express'

import {TimeSetRequestDto} from './dto/time-set-request.dto'
import {TimeSetResponseDto} from './dto/time-set-response.dto'
import {TimeSetSearchDto} from './dto/time-set-search.dto'
import {ApiTimeSetOkResponse} from './time-set-calendar.swagger'
import {TimeSetService} from './time-set.service'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {TimeSetEventEmbeddedRequestDto} from '~/api/time-sets/events/dto/event-embedded-request.dto'
import {eventRuleViolations} from '~/api/time-sets/events/event-rules'
import {TimeSetEventService} from '~/api/time-sets/events/event.service'
import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiAcceptHeader} from '~/decorators/api-accept-header.decorator'
import {ApiCreatedResponse} from '~/decorators/api-created-response.decorator'
import {ApiOneOrManyBody} from '~/decorators/api-one-or-many-body.decorator'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {ApiPutBody} from '~/decorators/api-put-body.decorator'
import {ApiSearchQuery} from '~/decorators/api-search-query.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {ParamOrBody} from '~/decorators/param-or-body.decorator'
import {Transactional} from '~/decorators/transactional.decorator'
import {PatchDto} from '~/dto/patch.dto'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ApiErrors, errorMessage, itemPointer} from '~/helpers/errors.helper'
import {Operation, patchManyToEntities, patchToEntity} from '~/helpers/patch.helper'
import {writeFileLimit} from '~/helpers/request-limits.helper'
import {validatePatchResellerId, validateResellerId} from '~/helpers/reseller-id.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {calendarToDtos} from '~/helpers/time-set-calendar.helper'
import {forEachYield, mapYield} from '~/helpers/yield.helper'
import {FileUploadInterceptor} from '~/interceptors/file-upload.interceptor'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIdDictionary} from '~/pipes/parse-id-dictionary.pipe'
import {ParseIntIdArrayPipe} from '~/pipes/parse-int-id-array.pipe'
import {ParseOneOrManyPipe} from '~/pipes/parse-one-or-many.pipe'
import {ParsePatchPipe} from '~/pipes/parse-patch.pipe'

const resourceName = 'time-sets'

const uploadInterceptor = FileUploadInterceptor('file', writeFileLimit())

// the name without characters that need quoting, with the id to keep the files of equal names apart
function toCalendarFile(timeSet: internal.TimeSet, ical: string): StreamableFile {
    const filename = `${timeSet.name.replace(/[^A-Za-z0-9 ]/g, '_')}_${timeSet.id}.ics`
    return new StreamableFile(Buffer.from(ical, 'utf-8'), {
        type: 'text/calendar; charset=utf-8',
        disposition: `attachment; filename="${filename}"`,
    })
}

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
)
@ApiTags('TimeSet')
@Controller(resourceName)
export class TimeSetController extends CrudController<TimeSetRequestDto, TimeSetResponseDto> {
    private readonly log = new LoggerService(TimeSetController.name)

    constructor(
        private readonly timeSetService: TimeSetService,
        private readonly eventService: TimeSetEventService,
        private readonly journalService: JournalService,
    ) {
        super(resourceName, timeSetService, journalService)
    }

    @Post()
    @ApiCreatedResponse(TimeSetResponseDto)
    @ApiConsumes('application/json', 'multipart/form-data')
    @ApiOneOrManyBody(TimeSetRequestDto)
    @UseInterceptors(uploadInterceptor)
    @Transactional()
    async create(
        @Body(new ParseOneOrManyPipe({items: TimeSetRequestDto})) createDto: TimeSetRequestDto[],
        @Req() req: Request,
        @UploadedFile() file?: Express.Multer.File,
    ): Promise<TimeSetResponseDto[]> {
        this.log.debug({
            message: 'create time set bulk',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        if (file)
            createDto[0].events = await calendarToDtos(file, TimeSetEventEmbeddedRequestDto, '/events')
        validateResellerId(createDto, sr)
        await this.checkEventRules(createDto, sr)
        const timeSets = await mapYield(createDto, dto => dto.toInternal())
        const created = await this.timeSetService.create(timeSets, sr)
        await this.eventService.create(await this.toEvents(createDto, created.map(timeSet => timeSet.id)), sr)

        const response = await mapYield(created, timeSet => new TimeSetResponseDto(timeSet, {url: req.url}))
        await this.journalService.writeJournals(sr, response.map(entry => ({id: entry.id, data: entry})))
        return response
    }

    @Get()
    @ApiSearchQuery(SearchLogic, TimeSetSearchDto)
    @ApiPaginatedResponse(TimeSetResponseDto)
    async readAll(@Req() req: Request): Promise<[TimeSetResponseDto[], number]> {
        this.log.debug({
            message: 'read all time sets',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const [timeSets, totalCount] = await this.timeSetService.readAll(new ServiceRequest(req))
        const responseList = timeSets.map(timeSet => new TimeSetResponseDto(timeSet, {url: req.url}))
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiTimeSetOkResponse(TimeSetResponseDto)
    @ApiAcceptHeader('application/json', 'application/hal+json', 'text/calendar')
    async read(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request,
        @Response({passthrough: true}) res: ExpressResponse,
    ): Promise<TimeSetResponseDto | StreamableFile> {
        this.log.debug({
            message: 'read time set by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        res.vary('Accept')
        if (req.accepts(['application/json', 'text/calendar']) == 'text/calendar') {
            const {timeSet, ical} = await this.timeSetService.readCalendar(id, sr)
            // the file is sent as is, it must not be transformed to json (see TransformInterceptor)
            res['passthrough'] = true
            return toCalendarFile(timeSet, ical)
        }
        return new TimeSetResponseDto(
            await this.timeSetService.read(id, sr),
            {url: req.url, containsResourceId: true},
        )
    }

    @Put(':id')
    @ApiOkResponse({
        type: TimeSetResponseDto,
    })
    @ApiConsumes('application/json', 'multipart/form-data')
    @ApiBody({type: TimeSetRequestDto})
    @UseInterceptors(uploadInterceptor)
    @Transactional()
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: TimeSetRequestDto,
        @Req() req: Request,
        @UploadedFile() file?: Express.Multer.File,
    ): Promise<TimeSetResponseDto> {
        this.log.debug({
            message: 'update time set by id',
            id: id,
            func: this.update.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        if (file)
            dto.events = await calendarToDtos(file, TimeSetEventEmbeddedRequestDto, '/events')
        validateResellerId(new Dictionary(id.toString(), dto), sr)
        await this.checkEventRules([dto], sr)
        const updates = new Dictionary<internal.TimeSet>(id.toString(), dto.toInternal({id, assignNulls: true}))
        await this.timeSetService.update(updates, sr)
        await this.replaceEvents([dto], [id], sr)
        const response = new TimeSetResponseDto(
            await this.timeSetService.read(id, sr),
            {url: req.url, containsResourceId: true},
        )
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put()
    @ApiPutBody(TimeSetRequestDto)
    @Transactional()
    async updateMany(
        @Body(new ParseIdDictionary({items: TimeSetRequestDto})) updates: Dictionary<TimeSetRequestDto>,
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({message: 'update time sets bulk', func: this.updateMany.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        validateResellerId(updates, sr)
        await this.checkEventRules(updates, sr)
        const timeSets = new Dictionary<internal.TimeSet>()
        for (const id of Object.keys(updates))
            timeSets[id] = updates[id].toInternal({id: parseInt(id), assignNulls: true})
        const updatedIds = await this.timeSetService.update(timeSets, sr)
        await this.replaceEvents(updatedIds.map(id => updates[id]), updatedIds, sr)
        return updatedIds
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
        @Req() req: Request,
    ): Promise<TimeSetResponseDto> {
        this.log.debug({
            message: 'patch time set by id',
            id: id,
            func: this.adjust.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        validatePatchResellerId(new Dictionary(id.toString(), patch), sr)
        const oldEntity = await this.timeSetService.read(id, sr)
        const entity = await patchToEntity<internal.TimeSet, TimeSetRequestDto>(oldEntity, patch, TimeSetRequestDto)
        await this.timeSetService.update(new Dictionary<internal.TimeSet>(id.toString(), entity), sr)
        const response = new TimeSetResponseDto(
            await this.timeSetService.read(id, sr),
            {url: req.url, containsResourceId: true},
        )
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Patch()
    @ApiConsumes('application/json-patch+json')
    @ApiPutBody(PatchDto)
    @Transactional()
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) patches: Dictionary<Operation[]>,
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({
            message: 'patch time sets bulk',
            func: this.adjustMany.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        validatePatchResellerId(patches, sr)
        const updates = await patchManyToEntities<internal.TimeSet, TimeSetRequestDto>(patches, id => this.timeSetService.read(id, sr), TimeSetRequestDto)
        return await this.timeSetService.update(updates, sr)
    }

    @Delete('{/:id}')
    @ApiOkResponse({
        type: [Number],
    })
    @Transactional()
    async delete(
        @ParamOrBody('id', new ParseIntIdArrayPipe()) ids: number[],
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({
            message: 'delete time set by id',
            id: ids,
            func: this.delete.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const deletedIds = await this.timeSetService.delete(ids, sr)
        await this.journalService.writeJournals(sr, deletedIds.map(id => ({id, data: {}})))
        return deletedIds
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, @Req() req: Request): Promise<[JournalResponseDto[], number]> {
        this.log.debug({
            message: 'read time set journal by id',
            id: id,
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }

    // the event service checks the rules too, but its pointers can't reach into the events of a time set
    private async checkEventRules(dtos: TimeSetRequestDto[] | Dictionary<TimeSetRequestDto>, sr: ServiceRequest): Promise<void> {
        const errors = new ApiErrors()
        for (const [key, dto] of Object.entries(dtos)) {
            await forEachYield(dto.events ?? [], (event, index) => {
                for (const {field, key: errorKey} of eventRuleViolations(event))
                    errors.add(errorMessage(errorKey, {field}), itemPointer(sr, key, dto, 'events', index, field))
            })
        }
        errors.throwIfAny()
    }

    private async replaceEvents(dtos: TimeSetRequestDto[], timeSetIds: number[], sr: ServiceRequest): Promise<void> {
        await this.eventService.deleteByTimeSetIds(timeSetIds)
        await this.eventService.create(await this.toEvents(dtos, timeSetIds), sr)
    }

    // the embedded events of the request's time sets, dtos[i] belongs to timeSetIds[i]
    private async toEvents(dtos: TimeSetRequestDto[], timeSetIds: number[]): Promise<internal.TimeSetEvent[]> {
        const events: internal.TimeSetEvent[] = []
        await forEachYield(dtos, async (dto, index) => {
            events.push(...await mapYield(dto.events ?? [], event => event.toInternal({parentId: timeSetIds[index]})))
        })
        return events
    }
}
