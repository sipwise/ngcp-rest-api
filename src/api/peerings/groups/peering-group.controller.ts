
import {Body, Controller, Delete, Get, Inject, Param, ParseIntPipe, Patch, Post, Put, Req, forwardRef} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {Operation} from 'fast-json-patch'
import {Transactional} from 'typeorm-transactional'
import {number} from 'yargs'

import {PeeringGroupRequestDto} from './dto/peering-group-request.dto'
import {PeeringGroupResponseDto} from './dto/peering-group-response.dto'
import {PeeringGroupSearchDto} from './dto/peering-group-search.dto'
import {PeeringGroupService} from './peering-group.service'

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
@ApiTags('RewriteRule')
@Controller(resourceName)
export class PeeringGroupController extends CrudController<PeeringGroupRequestDto, PeeringGroupResponseDto> {
    private readonly log = new LoggerService(PeeringGroupController.name)

    constructor(
        private readonly peeringGroupService: PeeringGroupService,
        @Inject(forwardRef(() => ExpandHelper))private readonly expander: ExpandHelper,
        private readonly journalService: JournalService,
    ) {
        super(resourceName)
    }

    @Post()
    @ApiCreatedResponse(PeeringGroupResponseDto)
    @ApiBody({
        type: PeeringGroupRequestDto,
        isArray: true,
    })
    @Transactional()
    async create(
        @Body(new ParseOneOrManyPipe({items: PeeringGroupRequestDto})) createDto: PeeringGroupRequestDto[],
        @Req() req: Request,
    ): Promise<PeeringGroupResponseDto[]> {
        this.log.debug({
            message: 'create peering groups bulk',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const groups = await Promise.all(createDto.map(async set => set.toInternal()))
        const created = await this.peeringGroupService.create(groups, sr)
        return await Promise.all(created.map(
            async set => new PeeringGroupResponseDto(
                set,
                {url: req.url},
            ),
        ))
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(PeeringGroupResponseDto)
    async readAll(@Req() req: Request): Promise<[PeeringGroupResponseDto[], number]> {
        this.log.debug({
            message: 'read all peering groups',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const [entity, totalCount] =
            await this.peeringGroupService.readAll(sr)
        const responseList = entity.map(e => new PeeringGroupResponseDto(
            e,
            {url: req.url},
        ))
        if (sr.query.expand) {
            const setSearchDtoKeys = Object.keys(new PeeringGroupSearchDto())
            await this.expander.expandObjects(responseList, setSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: PeeringGroupResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, @Req() req: Request): Promise<PeeringGroupResponseDto> {
        this.log.debug({
            message: 'read peering group by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const response = new PeeringGroupResponseDto(
            await this.peeringGroupService.read(id, sr),
            {url: req.url, containsResourceId: true},
        )
        if (sr.query.expand && !sr.isInternalRedirect) {
            const setSearchDtoKeys = Object.keys(new PeeringGroupSearchDto())
            await this.expander.expandObjects([response], setSearchDtoKeys, sr)
        }
        return response
    }

    @Put(':id')
    @ApiOkResponse({
        type: PeeringGroupResponseDto,
    })
    @Transactional()
    async update(@Param('id', ParseIntPipe) id: number, dto: PeeringGroupRequestDto, req: Request): Promise<PeeringGroupResponseDto> {
        this.log.debug({
            message: 'update peering group by id',
            id: id,
            func: this.update.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.VoipPeeringGroup>()
        updates[id] = Object.assign(new PeeringGroupRequestDto(), dto).toInternal({id: id, assignNulls: true})
        const ids = await this.peeringGroupService.update(updates, sr)
        const entity = await this.peeringGroupService.read(ids[0], sr)
        const response = new PeeringGroupResponseDto(
            entity,
            {url: req.url, containsResourceId: true},
        )
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put()
    @ApiPutBody(PeeringGroupRequestDto)
    @Transactional()
    async updateMany(
        @Body(new ParseIdDictionary({items: PeeringGroupRequestDto})) updates: Dictionary<PeeringGroupRequestDto>,
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({message: 'update peering group bulk', func: this.updateMany.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const sets = new Dictionary<internal.VoipPeeringGroup>()
        for (const id of Object.keys(updates)) {
            const dto: PeeringGroupRequestDto = updates[id]
            sets[id] = dto.toInternal({id: parseInt(id), assignNulls: true})
        }
        return await this.peeringGroupService.update(sets, sr)
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
    ): Promise<PeeringGroupResponseDto> {
        this.log.debug({
            message: 'patch peering group by id',
            id: id,
            func: this.adjust.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const oldEntity = await this.peeringGroupService.read(id, sr)
        const entity = await patchToEntity<internal.VoipPeeringGroup, PeeringGroupRequestDto>(oldEntity, patch, PeeringGroupRequestDto)
        const update = new Dictionary<internal.VoipPeeringGroup>(id.toString(), entity)

        const ids = await this.peeringGroupService.update(update, sr)
        const updatedEntity = await this.peeringGroupService.read(ids[0], sr)
        const response = new PeeringGroupResponseDto(
            updatedEntity,
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
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) patches: Dictionary<PatchOperation[]>,
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({
            message: 'patch peering group bulk',
            func: this.adjustMany.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)

        const updates = new Dictionary<internal.VoipPeeringGroup>()
        for (const id of Object.keys(patches)) {
            const oldEntity = await this.peeringGroupService.read(+id, sr)
            const entity = await patchToEntity<internal.VoipPeeringGroup, PeeringGroupRequestDto>(oldEntity, patches[id], PeeringGroupRequestDto)
            updates[id] = entity
        }

        return await this.peeringGroupService.update(updates, sr)
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
            message: 'delete peering group by id',
            id: ids,
            func: this.delete.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const deletedIds = await this.peeringGroupService.delete(ids, sr)
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
            message: 'read peering group journal by id',
            id: id,
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }
}
