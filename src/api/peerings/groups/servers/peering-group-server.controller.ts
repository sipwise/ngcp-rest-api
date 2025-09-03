import {Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Req, ValidationPipe} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {Transactional} from 'typeorm-transactional'
import {number} from 'yargs'

import {PeeringGroupServerRequestDto} from './dto/peering-group-server-request.dto'
import {PeeringGroupServerRequestParamDto} from './dto/peering-group-server-request.param.dto'
import {PeeringGroupServerResponseDto} from './dto/peering-group-server-response.dto'
import {PeeringGroupServerService} from './peering-group-server.service'

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
import {Operation} from '~/helpers/patch.helper'
import {Operation as PatchOperation,patchToEntity} from '~/helpers/patch.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIdDictionary} from '~/pipes/parse-id-dictionary.pipe'
import {ParseIntIdArrayPipe} from '~/pipes/parse-int-id-array.pipe'
import {ParseOneOrManyPipe} from '~/pipes/parse-one-or-many.pipe'
import {ParsePatchPipe} from '~/pipes/parse-patch.pipe'

const resourceName = 'peerings/groups'

@Auth(
    RbacRole.system,
    RbacRole.admin,
)
@ApiTags('Peering')
@Controller(resourceName)
export class PeeringGroupServerController extends CrudController<PeeringGroupServerRequestDto, PeeringGroupServerResponseDto> {
    private readonly log = new LoggerService(PeeringGroupServerController.name)

    constructor(
        private readonly serverService: PeeringGroupServerService,
        private readonly journalService: JournalService,
    ) {
        super(resourceName, serverService)
    }

    @Post(':groupId?/servers')
    @ApiCreatedResponse(PeeringGroupServerResponseDto)
    @ApiBody({
        type: PeeringGroupServerRequestDto,
        isArray: true,
    })
    @Transactional()
    async create(
        @Body(new ParseOneOrManyPipe({items: PeeringGroupServerRequestDto})) createDto: PeeringGroupServerRequestDto[],
        @Req() req: Request,
    ): Promise<PeeringGroupServerResponseDto[]> {
        this.log.debug({
            message: 'create peering server bulk',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const servers = await Promise.all(createDto.map(async set => set.toInternal()))
        const created = await this.serverService.create(servers, sr)
        return await Promise.all(created.map(async server => new PeeringGroupServerResponseDto(
            server,
            {url: req.url},
        )))
    }

    @Get(':groupId?/servers')
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(PeeringGroupServerResponseDto)
    async readAll(
        @Req() req: Request,
        @Param(new ValidationPipe()) _reqParams: PeeringGroupServerRequestParamDto): Promise<[PeeringGroupServerResponseDto[], number]> {
        this.log.debug({
            message: 'read all peering servers across all groups',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const [entity, totalCount] =
            await this.serverService.readAll(sr)
        const responseList = entity.map(e => new PeeringGroupServerResponseDto(
            e,
            {url: req.url},
        ))
        return [responseList, totalCount]
    }

    @Get(':groupId?/servers/:id')
    @ApiOkResponse({
        type: PeeringGroupServerResponseDto,
    })
    async read(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request,
        // TODO: _Prefix does not work here, fix?
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        @Param(new ValidationPipe()) {groupId}: PeeringGroupServerRequestParamDto = new PeeringGroupServerRequestParamDto(),
    ): Promise<PeeringGroupServerResponseDto> {
        this.log.debug({
            message: 'read peering server by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        return new PeeringGroupServerResponseDto(
            await this.serverService.read(id, new ServiceRequest(req)),
            {url: req.url, containsResourceId: true},
        )
    }

    @Put(':groupId?/servers/:id')
    @ApiOkResponse({
        type: PeeringGroupServerResponseDto,
    })
    @Transactional()
    async update(@Param('id', ParseIntPipe) id: number,
        dto: PeeringGroupServerRequestDto,
        @Req() req: Request,
        // TODO: _Prefix does not work here, fix?
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        @Param(new ValidationPipe()) {groupId}: PeeringGroupServerRequestParamDto = new PeeringGroupServerRequestParamDto(),  
    ): Promise<PeeringGroupServerResponseDto> {
        this.log.debug({
            message: 'update peering server by id',
            id: id,
            func: this.update.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.VoipPeeringServer>()
        updates[id] = Object.assign(new PeeringGroupServerRequestDto(), dto).toInternal({id: id, assignNulls: true})
        const ids = await this.serverService.update(updates, sr)
        const entity = await this.serverService.read(ids[0], sr)
        const response = new PeeringGroupServerResponseDto(
            entity,
            {url: req.url, containsResourceId: true},
        )
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put(':groupId?/servers')
    @ApiPutBody(PeeringGroupServerRequestDto)
    @Transactional()
    async updateMany(
        @Body(new ParseIdDictionary({items: PeeringGroupServerRequestDto})) updates: Dictionary<PeeringGroupServerRequestDto>,
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({message: 'update peering server Sets bulk', func: this.updateMany.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const sets = new Dictionary<internal.VoipPeeringServer>()
        for (const id of Object.keys(updates)) {
            const dto: PeeringGroupServerRequestDto = updates[id]
            sets[id] = dto.toInternal({id: parseInt(id), assignNulls: true})
        }
        return await this.serverService.update(sets, sr)
    }

    @Patch(':groupId?/servers/:id')
    @ApiConsumes('application/json-patch+json')
    @ApiBody({
        type: [PatchDto],
    })
    @Transactional()
    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ParsePatchPipe()) patch: Operation[],
        @Req() req: Request,
    ): Promise<PeeringGroupServerResponseDto> {
        this.log.debug({
            message: 'patch peering server set by id',
            id: id,
            func: this.adjust.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)

        const oldEntity = await this.serverService.read(id, sr)
        const entity = await patchToEntity<internal.VoipPeeringServer, PeeringGroupServerRequestDto>(oldEntity, patch, PeeringGroupServerRequestDto)
        const update = new Dictionary<internal.VoipPeeringServer>(id.toString(), entity)

        const ids = await this.serverService.update(update, sr)
        const updatedEntity = await this.serverService.read(ids[0], sr)
        const response = new PeeringGroupServerResponseDto(
            updatedEntity,
            {url: req.url, containsResourceId: true},
        )
        await this.journalService.writeJournal(sr, id, response)

        return response
    }

    @Patch(':groupId?/servers')
    @ApiConsumes('application/json-patch+json')
    @ApiPutBody(PatchDto)
    @Transactional()
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) patches: Dictionary<PatchOperation[]>,
        @Req() req: Request,
    ): Promise<number[]> {
        const sr = new ServiceRequest(req)

        const updates = new Dictionary<internal.VoipPeeringServer>()
        for (const id of Object.keys(patches)) {
            const oldEntity = await this.serverService.read(+id, sr)
            const entity = await patchToEntity<internal.VoipPeeringServer, PeeringGroupServerRequestDto>(oldEntity, patches[id], PeeringGroupServerRequestDto)
            updates[id] = entity
        }

        return await this.serverService.update(updates, sr)
    }

    @Delete(':groupId?/servers/:id?')
    @ApiOkResponse({
        type: [number],
    })
    @Transactional()
    async delete(
        @ParamOrBody('id', new ParseIntIdArrayPipe()) ids: number[],
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({
            message: 'delete peering server set by id',
            id: ids,
            func: this.delete.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const deletedIds = await this.serverService.delete(ids, sr)
        for (const deletedId of deletedIds) {
            await this.journalService.writeJournal(sr, deletedId, {})
        }
        return deletedIds
    }

    @Get(':groupId?/servers/:id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, @Req() req: Request): Promise<[JournalResponseDto[], number]> {
        this.log.debug({
            message: 'read peering server journal by id',
            id: id,
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }
}
