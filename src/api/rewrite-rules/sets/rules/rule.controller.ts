import {Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Put, Req} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiOperation, ApiParam, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {RewriteRuleCloneRequestDto} from './dto/rule-clone-request.dto'
import {RewriteRuleMoveRequestDto} from './dto/rule-move-request.dto'
import {RewriteRuleRequestDto} from './dto/rule-request.dto'
import {RewriteRuleService} from './rule.service'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {RewriteRuleResponseDto} from '~/api/rewrite-rules/sets/rules/dto/rule-response.dto'
import {RewriteRuleSearchDto} from '~/api/rewrite-rules/sets/rules/dto/rule-search.dto'
import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
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
import {cloneOverrides} from '~/helpers/clone.helper'
import {Dictionary} from '~/helpers/dictionary.helper'
import {Operation as PatchOperation,patchManyToEntities, patchToEntity} from '~/helpers/patch.helper'
import {Operation} from '~/helpers/patch.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {mapYield} from '~/helpers/yield.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIdDictionary} from '~/pipes/parse-id-dictionary.pipe'
import {ParseIntIdArrayPipe} from '~/pipes/parse-int-id-array.pipe'
import {ParseIntIdPipe} from '~/pipes/parse-int-id.pipe'
import {ParseOneOrManyPipe} from '~/pipes/parse-one-or-many.pipe'
import {ParsePatchPipe} from '~/pipes/parse-patch.pipe'

const resourceName = 'rewrite-rules/sets'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
)
@ApiTags('RewriteRule')
@Controller(resourceName)
export class RewriteRuleController extends CrudController<RewriteRuleRequestDto, RewriteRuleResponseDto> {
    private readonly log = new LoggerService(RewriteRuleController.name)

    constructor(
        private readonly ruleService: RewriteRuleService,
        private readonly journalService: JournalService,
    ) {
        super(resourceName, ruleService, journalService)
    }

    @Post('{:setId/}rules')
    @ApiCreatedResponse(RewriteRuleResponseDto)
    @ApiOneOrManyBody(RewriteRuleRequestDto)
    @Transactional()
    async create(
        @Body(new ParseOneOrManyPipe({items: RewriteRuleRequestDto})) createDto: RewriteRuleRequestDto[],
        @Req() req: Request,
    ): Promise<RewriteRuleResponseDto[]> {
        this.log.debug({
            message: 'create rewrite rule bulk',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const sets = await mapYield(createDto, set => set.toInternal())
        const created = await this.ruleService.create(sets, sr)
        const response = await mapYield(created, rule => new RewriteRuleResponseDto(rule))
        await this.journalService.writeJournals(sr, response.map(entry => ({id: entry.id, data: entry})))
        return response
    }

    @Get('{:setId/}rules')
    @ApiParam({name: 'setId', required: false, type: Number})
    @ApiSearchQuery(SearchLogic, RewriteRuleSearchDto)
    @ApiPaginatedResponse(RewriteRuleResponseDto)
    async readAll(
        @Req() req: Request,
        @Param('setId', new ParseIntIdPipe({allowUndefined: true})) _setId: number,
    ): Promise<[RewriteRuleResponseDto[], number]> {
        this.log.debug({
            message: 'read all rewrite rules across all rule sets',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const [entity, totalCount] =
            await this.ruleService.readAll(sr)
        const responseList = entity.map(e => new RewriteRuleResponseDto(e))
        return [responseList, totalCount]
    }

    @Get('{:setId/}rules/:id')
    @ApiParam({name: 'setId', required: false, type: Number})
    @ApiOkResponse({
        type: RewriteRuleResponseDto,
    })
    async read(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request,
        @Param('setId', new ParseIntIdPipe({allowUndefined: true})) _setId: number,
    ): Promise<RewriteRuleResponseDto> {
        this.log.debug({
            message: 'read rewrite rule by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const rule = await this.ruleService.read(id, sr)
        const responseItem = new RewriteRuleResponseDto(rule)

        return responseItem
    }

    @Put('{:setId/}rules/:id')
    @ApiParam({name: 'setId', required: false, type: Number})
    @ApiOkResponse({
        type: RewriteRuleResponseDto,
    })
    @Transactional()
    async update(@Param('id', ParseIntPipe) id: number,
        @Body() dto: RewriteRuleRequestDto,
        @Req() req: Request,
        @Param('setId', new ParseIntIdPipe({allowUndefined: true})) _setId: number,
    ): Promise<RewriteRuleResponseDto> {
        this.log.debug({
            message: 'update rewrite rule by id',
            id: id,
            func: this.update.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.RewriteRule>()
        updates[id] = Object.assign(new RewriteRuleRequestDto(), dto).toInternal({id: id, assignNulls: true})
        const ids = await this.ruleService.update(updates, sr)
        const entity = await this.ruleService.read(ids[0], sr)
        const response = new RewriteRuleResponseDto(entity)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put('{:setId/}rules')
    @ApiPutBody(RewriteRuleRequestDto)
    @Transactional()
    async updateMany(
        @Body(new ParseIdDictionary({items: RewriteRuleRequestDto})) updates: Dictionary<RewriteRuleRequestDto>,
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({message: 'update rewrite rule Sets bulk', func: this.updateMany.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const sets = new Dictionary<internal.RewriteRule>()
        for (const id of Object.keys(updates)) {
            const dto: RewriteRuleRequestDto = updates[id]
            sets[id] = dto.toInternal({id: parseInt(id), assignNulls: true})
        }
        return await this.ruleService.update(sets, sr)
    }

    @Patch('{:setId/}rules/:id')
    @ApiConsumes('application/json-patch+json')
    @ApiBody({
        type: [PatchDto],
    })
    @Transactional()
    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ParsePatchPipe()) patch: Operation[],
        @Req() req: Request,
    ): Promise<RewriteRuleResponseDto> {
        this.log.debug({
            message: 'patch rewrite rule set by id',
            id: id,
            func: this.adjust.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)

        const oldEntity = await this.ruleService.read(id, sr)
        const entity = await patchToEntity<internal.RewriteRule, RewriteRuleRequestDto>(oldEntity, patch, RewriteRuleRequestDto)
        const update = new Dictionary<internal.RewriteRule>(id.toString(), entity)

        const ids = await this.ruleService.update(update, sr)
        const updatedEntity = await this.ruleService.read(ids[0], sr)
        const response = new RewriteRuleResponseDto(updatedEntity)
        await this.journalService.writeJournal(sr, id, response)

        return response
    }

    @Patch('{:setId/}rules')
    @ApiConsumes('application/json-patch+json')
    @ApiPutBody(PatchDto)
    @Transactional()
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) patches: Dictionary<PatchOperation[]>,
        @Req() req: Request,
    ): Promise<number[]> {
        const sr = new ServiceRequest(req)

        const updates = await patchManyToEntities<internal.RewriteRule, RewriteRuleRequestDto>(patches, id => this.ruleService.read(id, sr), RewriteRuleRequestDto)

        return await this.ruleService.update(updates, sr)
    }

    @Post('{:setId/}rules/:id/move')
    @ApiOperation({summary: 'Move a rewrite rule up or down'})
    @ApiParam({name: 'setId', required: false, type: Number})
    @ApiOkResponse({
        type: RewriteRuleResponseDto,
    })
    @HttpCode(HttpStatus.OK)
    @Transactional()
    async move(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: RewriteRuleMoveRequestDto,
        @Req() req: Request,
        @Param('setId', new ParseIntIdPipe({allowUndefined: true})) _setId: number,
    ): Promise<RewriteRuleResponseDto> {
        this.log.debug({
            message: 'move rewrite rule by id',
            id: id,
            func: this.move.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const changed = await this.ruleService.move(id, dto.direction, sr)
        const response = changed.map(rule => new RewriteRuleResponseDto(rule))
        await this.journalService.writeJournals(
            sr,
            response.map(entry => ({id: entry.id, data: entry})),
            {operation: 'update', resourceName: 'rewrite-rules/sets/rules'},
        )
        return response.find(entry => entry.id == id)
    }

    @Post('{:setId/}rules/:id/clone')
    @ApiOperation({
        summary: 'Clone a rewrite rule',
        description: 'Creates a copy of the rule. Fields given in the body replace the copied values. Without a priority in the body, the copy goes after the highest priority of its set. A priority that another rule of the set, direction and field already uses is rejected',
    })
    @ApiParam({name: 'setId', required: false, type: Number})
    @ApiCreatedResponse(RewriteRuleResponseDto)
    @ApiBody({
        type: RewriteRuleCloneRequestDto,
        required: false,
    })
    @Transactional()
    async clone(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: RewriteRuleCloneRequestDto,
        @Req() req: Request,
        @Param('setId', new ParseIntIdPipe({allowUndefined: true})) _setId: number,
    ): Promise<RewriteRuleResponseDto[]> {
        this.log.debug({
            message: 'clone rewrite rule by id',
            id: id,
            func: this.clone.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const overrides = await cloneOverrides(dto, RewriteRuleRequestDto)
        const created = await this.ruleService.clone(id, overrides, sr)
        const response = new RewriteRuleResponseDto(created)
        await this.journalService.writeJournals(
            sr,
            [{id: response.id, data: response}],
            {resourceName: 'rewrite-rules/sets/rules'},
        )
        return [response]
    }

    @Delete('{:setId/}rules{/:id}')
    @ApiOkResponse({
        type: [Number],
    })
    @Transactional()
    async delete(
        @ParamOrBody('id', new ParseIntIdArrayPipe()) ids: number[],
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({
            message: 'delete rewrite rule set by id',
            id: ids,
            func: this.delete.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const deletedIds = await this.ruleService.delete(ids, sr)
        await this.journalService.writeJournals(sr, deletedIds.map(id => ({id, data: {}})))
        return deletedIds
    }

    @Get('{:setId/}rules/:id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, @Req() req: Request): Promise<[JournalResponseDto[], number]> {
        this.log.debug({
            message: 'read rewrite rule journal by id',
            id: id,
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }
}
