import {Body, Controller, Delete, Get, Inject, Param, ParseIntPipe, Patch, Post, Put, Req, forwardRef} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {Transactional} from 'typeorm-transactional'
import {number} from 'yargs'

import {RewriteRuleSetRequestDto} from './dto/rewrite-rule-set-request.dto'
import {RewriteRuleSetResponseDto} from './dto/rewrite-rule-set-response.dto'
import {RewriteRuleSetSearchDto} from './dto/rewrite-rule-set-search.dto'
import {RewriteRuleSetService} from './rewrite-rule-set.service'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {RewriteRuleService} from '~/api/rewrite-rules/sets/rules/rewrite-rule.service'
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
@ApiTags('RewriteRule')
@Controller(resourceName)
export class RewriteRuleSetController extends CrudController<RewriteRuleSetRequestDto, RewriteRuleSetResponseDto> {
    private readonly log = new LoggerService(RewriteRuleSetController.name)

    constructor(
        private readonly ruleSetService: RewriteRuleSetService,
        private readonly ruleService: RewriteRuleService,
        @Inject(forwardRef(() => ExpandHelper))private readonly expander: ExpandHelper,
        private readonly journalService: JournalService,
    ) {
        super(resourceName)
    }

    @Post()
    @ApiCreatedResponse(RewriteRuleSetResponseDto)
    @ApiBody({
        type: RewriteRuleSetRequestDto,
        isArray: true,
    })
    @Transactional()
    async create(
        @Body(new ParseOneOrManyPipe({items: RewriteRuleSetRequestDto})) createDto: RewriteRuleSetRequestDto[],
        @Req() req: Request,
    ): Promise<RewriteRuleSetResponseDto[]> {
        this.log.debug({
            message: 'create rewrite rule set bulk',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const sets = await Promise.all(createDto.map(async set => set.toInternal()))
        const created = await this.ruleSetService.create(sets, sr)

        const createdSets = new Dictionary<internal.RewriteRuleSet>()
        created.forEach(set => createdSets[set.name] = set)
        for (const set of createDto) {
            const createdSet = createdSets[set.name]
            if (set.rules) {
                const rules = await Promise.all(set.rules.map(async rule => rule.toInternal({
                    parentId: createdSet.id,
                })))
                await this.ruleService.create(rules, sr)
            }
        }

        return await Promise.all(created.map(
            async set => new RewriteRuleSetResponseDto(
                set,
                {url: req.url},
            ),
        ))
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(RewriteRuleSetResponseDto)
    async readAll(@Req() req: Request): Promise<[RewriteRuleSetResponseDto[], number]> {
        this.log.debug({
            message: 'read all rewrite rule set',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const [entity, totalCount] =
            await this.ruleSetService.readAll(sr)
        const responseList = entity.map(e => new RewriteRuleSetResponseDto(
            e,
            {url: req.url},
        ))
        if (sr.query.expand) {
            const setSearchDtoKeys = Object.keys(new RewriteRuleSetSearchDto())
            await this.expander.expandObjects(responseList, setSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: RewriteRuleSetResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, @Req() req: Request): Promise<RewriteRuleSetResponseDto> {
        this.log.debug({
            message: 'read rewrite rule set by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const response = new RewriteRuleSetResponseDto(
            await this.ruleSetService.read(id, sr),
            {url: req.url, containsResourceId: true},
        )
        if (sr.query.expand && !sr.isInternalRedirect) {
            const setSearchDtoKeys = Object.keys(new RewriteRuleSetSearchDto())
            await this.expander.expandObjects([response], setSearchDtoKeys, sr)
        }
        return response
    }

    @Put(':id')
    @ApiOkResponse({
        type: RewriteRuleSetResponseDto,
    })
    @Transactional()
    async update(@Param('id', ParseIntPipe) id: number, dto: RewriteRuleSetRequestDto, req: Request): Promise<RewriteRuleSetResponseDto> {
        this.log.debug({
            message: 'update rewrite rule set by id',
            id: id,
            func: this.update.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.RewriteRuleSet>()
        updates[id] = Object.assign(new RewriteRuleSetRequestDto(), dto).toInternal({id: id, assignNulls: true})
        const rewriteRules = dto.rules && dto.rules.length > 0
            ? await Promise.all(dto.rules.map(async rule => rule.toInternal({parentId: id}))) : []
        const ids = await this.ruleSetService.updateWithRuleRecreation(updates, rewriteRules, sr)
        const entity = await this.ruleSetService.read(ids[0], sr)
        const response = new RewriteRuleSetResponseDto(
            entity,
            {url: req.url, containsResourceId: true},
        )
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put()
    @ApiPutBody(RewriteRuleSetRequestDto)
    @Transactional()
    async updateMany(
        @Body(new ParseIdDictionary({items: RewriteRuleSetRequestDto})) updates: Dictionary<RewriteRuleSetRequestDto>,
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({message: 'update rewrite rule Sets bulk', func: this.updateMany.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const sets = new Dictionary<internal.RewriteRuleSet>()
        for (const id of Object.keys(updates)) {
            const dto: RewriteRuleSetRequestDto = updates[id]
            sets[id] = dto.toInternal({id: parseInt(id), assignNulls: true})
        }
        const rewriteRules = []
        for (const set of Object.values(sets)) {
            const dto = updates[set.id]
            if (dto.rules) {
                rewriteRules.push(...dto.rules.map(rule => rule.toInternal({parentId: set.id})))
            }
        }
        const updated = await this.ruleSetService.updateWithRuleRecreation(sets, rewriteRules, sr)

        return updated
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
    ): Promise<RewriteRuleSetResponseDto> {
        this.log.debug({
            message: 'patch rewrite rule set by id',
            id: id,
            func: this.adjust.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const oldEntity = await this.ruleSetService.read(id, sr)
        const entity = await patchToEntity<internal.RewriteRuleSet, RewriteRuleSetRequestDto>(oldEntity, patch, RewriteRuleSetRequestDto)
        const update = new Dictionary<internal.RewriteRuleSet>(id.toString(), entity)

        const ids = await this.ruleSetService.update(update, sr)
        const updatedEntity = await this.ruleSetService.read(ids[0], sr)
        const response = new RewriteRuleSetResponseDto(
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
            message: 'patch rewrite rule set bulk',
            func: this.adjustMany.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)

        const updates = new Dictionary<internal.RewriteRuleSet>()
        for (const id of Object.keys(patches)) {
            const oldEntity = await this.ruleSetService.read(+id, sr)
            const entity = await patchToEntity<internal.RewriteRuleSet, RewriteRuleSetRequestDto>(oldEntity, patches[id], RewriteRuleSetRequestDto)
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
            message: 'delete rewrite rule set by id',
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
            message: 'read rewrite rule set journal by id',
            id: id,
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }

}
