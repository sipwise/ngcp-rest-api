import {Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Req, ValidationPipe} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {SubscriberQueryDto} from './dto/subscriber-query.dto'
import {SubscriberRequestDto, subscriberRequestFields} from './dto/subscriber-request.dto'
import {SubscriberResponseDto} from './dto/subscriber-response.dto'
import {SubscriberSearchDto} from './dto/subscriber-search.dto'
import {SubscriberService} from './subscriber.service'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiCreatedResponse} from '~/decorators/api-created-response.decorator'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {ApiPutBody} from '~/decorators/api-put-body.decorator'
import {ApiSearchQuery} from '~/decorators/api-search-query.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {Transactional} from '~/decorators/transactional.decorator'
import {PatchDto} from '~/dto/patch.dto'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ExpandHelper} from '~/helpers/expand.helper'
import {Operation, patchManyToEntities, patchToEntity} from '~/helpers/patch.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIdDictionary} from '~/pipes/parse-id-dictionary.pipe'
import {ParseOneOrManyPipe} from '~/pipes/parse-one-or-many.pipe'
import {ParsePatchPipe} from '~/pipes/parse-patch.pipe'

const resourceName = 'subscribers'

const createPrimaryAcliQuery = {
    name: 'create_primary_acli',
    required: false,
    enum: SearchLogic.booleanValues,
    description: 'Add allowed CLI entries for the primary and alias numbers (if enabled on the platform), default true',
}

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
    RbacRole.ccareadmin,
    RbacRole.ccare,
    RbacRole.subscriberadmin,
    RbacRole.subscriber,
)
@ApiTags('Subscriber')
@Controller(resourceName)
export class SubscriberController extends CrudController<SubscriberRequestDto, SubscriberResponseDto> {
    private readonly log = new LoggerService(SubscriberController.name)

    constructor(
        private readonly subscriberService: SubscriberService,
        private readonly journalService: JournalService,
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, subscriberService, journalService)
    }

    @Post()
    @ApiQuery(createPrimaryAcliQuery)
    @ApiCreatedResponse(SubscriberResponseDto)
    @ApiBody({type: SubscriberRequestDto, isArray: true})
    @Transactional()
    async create(
        @Body(new ParseOneOrManyPipe({items: SubscriberRequestDto})) createDto: SubscriberRequestDto[],
        @Req() req: Request,
    ): Promise<SubscriberResponseDto[]> {
        this.log.debug({
            message: 'create subscribers',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const subscribers = createDto.map(dto => Object.assign(new SubscriberRequestDto(), dto).toInternal())
        const created = await this.subscriberService.create(subscribers, sr)
        const response = created.map(subscriber => new SubscriberResponseDto(subscriber, sr.user.role))
        for (const entry of response)
            await this.journalService.writeJournal(sr, entry.id, entry)
        return response
    }

    @Get()
    @ApiSearchQuery(SearchLogic, SubscriberSearchDto)
    @ApiPaginatedResponse(SubscriberResponseDto)
    async readAll(
        @Req() req: Request,
        @Query(new ValidationPipe()) _query: SubscriberQueryDto,
    ): Promise<[SubscriberResponseDto[], number]> {
        this.log.debug({
            message: 'fetch all subscribers',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const [subscribers, totalCount] = await this.subscriberService.readAll(sr)
        const responseList = subscribers.map(s => new SubscriberResponseDto(s, sr.user.role, {url: req.url}))
        if (sr.query.expand) {
            const searchDtoKeys = Object.keys(new SubscriberSearchDto())
            await this.expander.expandObjects(responseList, searchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: SubscriberResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, @Req() req: Request): Promise<SubscriberResponseDto> {
        this.log.debug({
            message: 'fetch subscriber by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const response = new SubscriberResponseDto(
            await this.subscriberService.read(id, sr),
            sr.user.role,
            {url: req.url, containsResourceId: true},
        )
        if (sr.query.expand && !sr.isInternalRedirect) {
            const searchDtoKeys = Object.keys(new SubscriberSearchDto())
            await this.expander.expandObjects([response], searchDtoKeys, sr)
        }
        return response
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, @Req() req: Request): Promise<[JournalResponseDto[], number]> {
        this.log.debug({
            message: 'fetch subscriber journal by id',
            id: id,
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }

    @Put(':id')
    @ApiQuery(createPrimaryAcliQuery)
    @ApiOkResponse({type: SubscriberResponseDto})
    @Transactional()
    async update(
        @Param('id', ParseIntPipe) id: number,
            @Body() dto: SubscriberRequestDto,
        @Req() req: Request,
    ): Promise<SubscriberResponseDto> {
        this.log.debug({
            message: 'update subscriber by id',
            id: id,
            func: this.update.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.Subscriber>()
        updates[id] = Object.assign(new SubscriberRequestDto(), dto).toInternal({id})
        await this.subscriberService.update(updates, sr)
        const response = new SubscriberResponseDto(
            await this.subscriberService.read(id, sr),
            sr.user.role,
            {url: req.url, containsResourceId: true},
        )
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put()
    @ApiQuery(createPrimaryAcliQuery)
    @ApiPutBody(SubscriberRequestDto)
    @Transactional()
    async updateMany(
        @Body(new ParseIdDictionary({items: SubscriberRequestDto})) updates: Dictionary<SubscriberRequestDto>,
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({
            message: 'update subscribers',
            func: this.updateMany.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const subscribers = new Dictionary<internal.Subscriber>()
        for (const id of Object.keys(updates))
            subscribers[id] = Object.assign(new SubscriberRequestDto(), updates[id]).toInternal({id: +id})
        const ids = await this.subscriberService.update(subscribers, sr)
        for (const id of ids)
            await this.journalService.writeJournal(sr, id, new SubscriberResponseDto(
                await this.subscriberService.read(id, sr),
                sr.user.role,
            ))
        return ids
    }

    @Patch(':id')
    @ApiQuery(createPrimaryAcliQuery)
    @ApiConsumes('application/json-patch+json')
    @ApiBody({type: [PatchDto]})
    @Transactional()
    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ParsePatchPipe()) patch: Operation[],
        @Req() req: Request,
    ): Promise<SubscriberResponseDto> {
        this.log.debug({
            message: 'patch subscriber by id',
            id: id,
            func: this.adjust.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const oldEntity = await this.subscriberService.read(id, sr)
        const updates = new Dictionary<internal.Subscriber>()
        updates[id] = this.removedToNull(await patchToEntity<internal.Subscriber, SubscriberRequestDto>(oldEntity, patch, SubscriberRequestDto))
        await this.subscriberService.update(updates, sr)
        const response = new SubscriberResponseDto(
            await this.subscriberService.read(id, sr),
            sr.user.role,
            {url: req.url, containsResourceId: true},
        )
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Patch()
    @ApiQuery(createPrimaryAcliQuery)
    @ApiConsumes('application/json-patch+json')
    @ApiBody({type: PatchDto})
    @Transactional()
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) patches: Dictionary<Operation[]>,
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({
            message: 'patch subscribers',
            func: this.adjustMany.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = await patchManyToEntities<internal.Subscriber, SubscriberRequestDto>(patches, id => this.subscriberService.read(id, sr), SubscriberRequestDto)
        for (const id of Object.keys(updates))
            updates[id] = this.removedToNull(updates[id])
        const ids = await this.subscriberService.update(updates, sr)
        for (const id of ids)
            await this.journalService.writeJournal(sr, id, new SubscriberResponseDto(
                await this.subscriberService.read(id, sr),
                sr.user.role,
            ))
        return ids
    }

    /**
     * A field removed by a patch remove op is emptied (null)
     * TODO: make this the default behaviour of patchToEntity for all endpoints
     */
    private removedToNull(entity: internal.Subscriber): internal.Subscriber {
        for (const field of subscriberRequestFields) {
            if (entity[field] === undefined)
                Object.assign(entity, {[field]: null})
        }
        return entity
    }
}
