import {Body, Controller, Delete, Get, Inject, Param, ParseIntPipe, Patch, Post, Put, Req, forwardRef} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {Transactional} from 'typeorm-transactional'
import {number} from 'yargs'

import {HeaderManipulationSetRequestDto} from './dto/header-manipulation-set-request.dto'
import {HeaderManipulationSetResponseDto} from './dto/header-manipulation-set-response.dto'
import {HeaderManipulationSetSearchDto} from './dto/header-manipulation-set-search.dto'
import {HeaderManipulationSetService} from './header-manipulation-set.service'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {License as LicenseType, RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiCreatedResponse} from '~/decorators/api-created-response.decorator'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {ApiPutBody} from '~/decorators/api-put-body.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {License} from '~/decorators/license.decorator'
import {ParamOrBody} from '~/decorators/param-or-body.decorator'
import {PatchDto} from '~/dto/patch.dto'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ExpandHelper} from '~/helpers/expand.helper'
import {Operation} from '~/helpers/patch.helper'
import {Operation as PatchOperation,patchToEntity} from '~/helpers/patch.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIdDictionary} from '~/pipes/parse-id-dictionary.pipe'
import {ParseIntIdArrayPipe} from '~/pipes/parse-int-id-array.pipe'
import {ParseOneOrManyPipe} from '~/pipes/parse-one-or-many.pipe'
import {ParsePatchPipe} from '~/pipes/parse-patch.pipe'

const resourceName = 'header-manipulations/sets'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
)
@ApiTags('HeaderManipulation')
@Controller(resourceName)
@License(LicenseType.headerManipulation)
export class HeaderManipulationSetController extends CrudController<HeaderManipulationSetRequestDto, HeaderManipulationSetResponseDto> {
    private readonly log = new LoggerService(HeaderManipulationSetController.name)

    constructor(
        private readonly ruleSetService: HeaderManipulationSetService,
        @Inject(forwardRef(() => ExpandHelper)) private readonly expander: ExpandHelper,
        private readonly journalService: JournalService,
    ) {
        super(resourceName, ruleSetService)
    }

    @Post()
    @ApiCreatedResponse(HeaderManipulationSetResponseDto)
    @ApiBody({
        type: HeaderManipulationSetRequestDto,
        isArray: true,
    })
    @Transactional()
    async create(
        @Body(new ParseOneOrManyPipe({items: HeaderManipulationSetRequestDto})) createDto: HeaderManipulationSetRequestDto[],
        @Req() req: Request,
    ): Promise<HeaderManipulationSetResponseDto[]> {
        this.log.debug({
            message: 'create header rule set bulk',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const sets = await Promise.all(createDto.map(async set => set.toInternal()))
        const created = await this.ruleSetService.create(sets, sr)
        return await Promise.all(created.map(async set => new HeaderManipulationSetResponseDto(
            set,
            {url: req.url},
        )))
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(HeaderManipulationSetResponseDto)
    async readAll(@Req() req: Request): Promise<[HeaderManipulationSetResponseDto[], number]> {
        this.log.debug({
            message: 'read all header rule set',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const [entity, totalCount] =
            await this.ruleSetService.readAll(sr)
        const responseList = entity.map(e => new HeaderManipulationSetResponseDto(
            e,
            {url: req.url},
        ))
        if (sr.query.expand) {
            const setSearchDtoKeys = Object.keys(new HeaderManipulationSetSearchDto())
            await this.expander.expandObjects(responseList, setSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: HeaderManipulationSetResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, @Req() req: Request): Promise<HeaderManipulationSetResponseDto> {
        this.log.debug({
            message: 'read header rule set by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const response = new HeaderManipulationSetResponseDto(
            await this.ruleSetService.read(id, sr),
            {url: req.url, containsResourceId: true},
        )
        if (sr.query.expand && !sr.isInternalRedirect) {
            const setSearchDtoKeys = Object.keys(new HeaderManipulationSetSearchDto())
            await this.expander.expandObjects([response], setSearchDtoKeys, sr)
        }
        return response
    }

    @Put(':id')
    @ApiOkResponse({
        type: HeaderManipulationSetResponseDto,
    })
    @Transactional()
    async update(@Param('id', ParseIntPipe) id: number, dto: HeaderManipulationSetRequestDto, req: Request): Promise<HeaderManipulationSetResponseDto> {
        this.log.debug({
            message: 'update header rule set by id',
            id: id,
            func: this.update.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.HeaderRuleSet>()
        updates[id] = Object.assign(new HeaderManipulationSetRequestDto(), dto).toInternal({id: id, assignNulls: true})
        const ids = await this.ruleSetService.update(updates, sr)
        const entity = await this.ruleSetService.read(ids[0], sr)
        const response = new HeaderManipulationSetResponseDto(
            entity,
            {url: req.url, containsResourceId: true},
        )
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put()
    @ApiPutBody(HeaderManipulationSetRequestDto)
    @Transactional()
    async updateMany(
        @Body(new ParseIdDictionary({items: HeaderManipulationSetRequestDto})) updates: Dictionary<HeaderManipulationSetRequestDto>,
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({message: 'update header rule Sets bulk', func: this.updateMany.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const sets = new Dictionary<internal.HeaderRuleSet>()
        for (const id of Object.keys(updates)) {
            const dto: HeaderManipulationSetRequestDto = updates[id]
            sets[id] = dto.toInternal({id: parseInt(id), assignNulls: true})
        }
        return await this.ruleSetService.update(sets, sr)
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
    ): Promise<HeaderManipulationSetResponseDto> {
        this.log.debug({
            message: 'patch header rule set by id',
            id: id,
            func: this.adjust.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const oldEntity = await this.ruleSetService.read(id, sr)
        const entity = await patchToEntity<internal.HeaderRuleSet, HeaderManipulationSetRequestDto>(oldEntity, patch, HeaderManipulationSetRequestDto)
        const update = new Dictionary<internal.HeaderRuleSet>(id.toString(), entity)

        const ids = await this.ruleSetService.update(update, sr)
        const updatedEntity = await this.ruleSetService.read(ids[0], sr)
        const response = new HeaderManipulationSetResponseDto(
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
            message: 'patch header rule set bulk',
            func: this.adjustMany.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)

        const updates = new Dictionary<internal.HeaderRuleSet>()
        for (const id of Object.keys(patches)) {
            const oldEntity = await this.ruleSetService.read(+id, sr)
            const entity = await patchToEntity<internal.HeaderRuleSet, HeaderManipulationSetRequestDto>(oldEntity, patches[id], HeaderManipulationSetRequestDto)
            updates[id] = entity
        }

        return await this.ruleSetService.update(updates, sr)
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
            message: 'delete header rule set by id',
            id: ids,
            func: this.delete.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const deletedIds = await this.ruleSetService.delete(ids, sr)
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
            message: 'read header rule set journal by id',
            id: id,
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }

}
