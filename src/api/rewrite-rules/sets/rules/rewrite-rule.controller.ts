import {Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Req, ValidationPipe} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {number} from 'yargs'

import {RewriteRuleRequestDto} from './dto/rewrite-rule-request.dto'
import {RewriteRuleService} from './rewrite-rule.service'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {RewriteRuleRequestParamDto} from '~/api/rewrite-rules/sets/rules/dto/rewrite-rule-request-param.dto'
import {RewriteRuleResponseDto} from '~/api/rewrite-rules/sets/rules/dto/rewrite-rule-response.dto'
import {RewriteRuleSearchDto} from '~/api/rewrite-rules/sets/rules/dto/rewrite-rule-search.dto'
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
import {Operation} from '~/helpers/patch.helper'
import {Operation as PatchOperation,patchToEntity} from '~/helpers/patch.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIdDictionary} from '~/pipes/parse-id-dictionary.pipe'
import {ParseIntIdArrayPipe} from '~/pipes/parse-int-id-array.pipe'
import {ParseOneOrManyPipe} from '~/pipes/parse-one-or-many.pipe'
import {ParsePatchPipe} from '~/pipes/parse-patch.pipe'

const resourceName = 'rewrite-rules/sets'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
)
@ApiTags('Rewrite Rules')
@Controller(resourceName)
export class RewriteRuleController extends CrudController<RewriteRuleRequestDto, RewriteRuleResponseDto> {
    private readonly log = new LoggerService(RewriteRuleController.name)

    constructor(
        private readonly ruleService: RewriteRuleService,
        private readonly expander: ExpandHelper,
        private readonly journalService: JournalService,
    ) {
        super(resourceName, ruleService)
    }

    @Post(':setId?/rules')
    @ApiCreatedResponse(RewriteRuleResponseDto)
    @ApiBody({
        type: RewriteRuleRequestDto,
        isArray: true,
    })
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
        const sets = await Promise.all(createDto.map(async set => set.toInternal()))
        const created = await this.ruleService.create(sets, sr)
        return await Promise.all(created.map(async rule => new RewriteRuleResponseDto(rule)))
    }

    @Get(':setId?/rules')
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(RewriteRuleResponseDto)
    async readAll(
        @Req() req: Request,
        @Param(new ValidationPipe()) _reqParams: RewriteRuleRequestParamDto): Promise<[RewriteRuleResponseDto[], number]> {
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
        if (sr.query.expand) {
            await this.expander.expandObjects(responseList, Object.keys(new RewriteRuleSearchDto()), sr)
        }
        return [responseList, totalCount]
    }

    @Get(':setId?/rules/:id')
    @ApiOkResponse({
        type: RewriteRuleResponseDto,
    })
    async read(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request,
        // TODO: _Prefix does not work here, fix?
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        @Param(new ValidationPipe()) {setId}: RewriteRuleRequestParamDto = new RewriteRuleRequestParamDto(),
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
        if (sr.query.expand) {
            await this.expander.expandObjects([responseItem], Object.keys(new RewriteRuleSearchDto()), sr)
        }

        return responseItem
    }

    @Put(':setId?/rules/:id')
    @ApiOkResponse({
        type: RewriteRuleResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number,
        dto: RewriteRuleRequestDto,
        @Req() req: Request,
        // TODO: _Prefix does not work here, fix?
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        @Param(new ValidationPipe()) {setId}: RewriteRuleRequestParamDto = new RewriteRuleRequestParamDto(),  
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

    @Put(':setId?/rules')
    @ApiPutBody(RewriteRuleRequestDto)
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

    @Patch(':setId?/rules/:id')
    @ApiConsumes('application/json-patch+json')
    @ApiBody({
        type: [PatchDto],
    })
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

    @Patch(':setId?/rules')
    @ApiConsumes('application/json-patch+json')
    @ApiPutBody(PatchDto)
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) patches: Dictionary<PatchOperation[]>,
        @Req() req: Request,
    ): Promise<number[]> {
        const sr = new ServiceRequest(req)

        const updates = new Dictionary<internal.RewriteRule>()
        for (const id of Object.keys(patches)) {
            const oldEntity = await this.ruleService.read(+id, sr)
            const entity = await patchToEntity<internal.RewriteRule, RewriteRuleRequestDto>(oldEntity, patches[id], RewriteRuleRequestDto)
            updates[id] = entity
        }

        return await this.ruleService.update(updates, sr)
    }

    @Delete(':setId?/rules/:id?')
    @ApiOkResponse({
        type: [number],
    })
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
        for (const deletedId of deletedIds) {
            await this.journalService.writeJournal(sr, deletedId, {})
        }
        return deletedIds
    }

    @Get(':setId?/rules/:id/journal')
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
