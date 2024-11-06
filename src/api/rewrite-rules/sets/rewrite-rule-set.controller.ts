import {Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Req} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {number} from 'yargs'

import {RewriteRuleSetRequestDto} from './dto/rewrite-rule-set-request.dto'
import {RewriteRuleSetResponseDto} from './dto/rewrite-rule-set-response.dto'
import {RewriteRuleSetSearchDto} from './dto/rewrite-rule-set-search.dto'
import {RewriteRuleSetService} from './rewrite-rule-set.service'

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
export class RewriteRuleSetController extends CrudController<RewriteRuleSetRequestDto, RewriteRuleSetResponseDto> {
    private readonly log = new LoggerService(RewriteRuleSetController.name)

    constructor(
        private readonly ruleSetService: RewriteRuleSetService,
        private readonly expander: ExpandHelper,
        private readonly journalService: JournalService,
    ) {
        super(resourceName, ruleSetService)
    }

    @Post()
    @ApiCreatedResponse(RewriteRuleSetResponseDto)
    @ApiBody({
        type: RewriteRuleSetRequestDto,
        isArray: true,
    })
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
        return await Promise.all(created.map(async set => new RewriteRuleSetResponseDto(req.url, set)))
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
        const responseList = entity.map(e => new RewriteRuleSetResponseDto(req.url, e))
        if (req.query.expand) {
            const setSearchDtoKeys = Object.keys(new RewriteRuleSetSearchDto())
            await this.expander.expandObjects(responseList, setSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: RewriteRuleSetResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, req: Request): Promise<RewriteRuleSetResponseDto> {
        this.log.debug({
            message: 'read rewrite rule set by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const response = new RewriteRuleSetResponseDto(req.url, await this.ruleSetService.read(id, sr))
        if (req.query.expand) {
            const setSearchDtoKeys = Object.keys(new RewriteRuleSetSearchDto())
            await this.expander.expandObjects([response], setSearchDtoKeys, sr)
        }
        return response
    }

    @Put(':id')
    @ApiOkResponse({
        type: RewriteRuleSetResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number, dto: RewriteRuleSetRequestDto, req: Request): Promise<RewriteRuleSetResponseDto> {
        this.log.debug({
            message: 'update rewrite rule set by id',
            id: id,
            func: this.update.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.HeaderRuleSet>()
        updates[id] = Object.assign(new RewriteRuleSetRequestDto(), dto).toInternal({id: id, assignNulls: true})
        const ids = await this.ruleSetService.update(updates, sr)
        const entity = await this.ruleSetService.read(ids[0], sr)
        const response = new RewriteRuleSetResponseDto(req.url, entity)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put()
    @ApiPutBody(RewriteRuleSetRequestDto)
    async updateMany(
        @Body(new ParseIdDictionary({items: RewriteRuleSetRequestDto})) updates: Dictionary<RewriteRuleSetRequestDto>,
        @Req() req,
    ): Promise<number[]> {
        this.log.debug({message: 'update rewrite rule Sets bulk', func: this.updateMany.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const sets = new Dictionary<internal.HeaderRuleSet>()
        for (const id of Object.keys(updates)) {
            const dto: RewriteRuleSetRequestDto = updates[id]
            sets[id] = dto.toInternal({id: parseInt(id), assignNulls: true})
        }
        return await this.ruleSetService.update(sets, sr)
    }

    @Patch(':id')
    @ApiConsumes('application/json-patch+json')
    @ApiBody({
        type: [PatchDto],
    })
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
        const entity = await patchToEntity<internal.HeaderRuleSet, RewriteRuleSetRequestDto>(oldEntity, patch, RewriteRuleSetRequestDto)
        const update = new Dictionary<internal.HeaderRuleSet>(id.toString(), entity)

        const ids = await this.ruleSetService.update(update, sr)
        const updatedEntity = await this.ruleSetService.read(ids[0], sr)
        const response = new RewriteRuleSetResponseDto(req.url, updatedEntity)
        await this.journalService.writeJournal(sr, id, response)

        return response
    }

    @Patch()
    @ApiConsumes('application/json-patch+json')
    @ApiPutBody(PatchDto)
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) patches: Dictionary<PatchOperation[]>,
        @Req() req,
    ): Promise<number[]> {
        this.log.debug({
            message: 'patch rewrite rule set bulk',
            func: this.adjustMany.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)

        const updates = new Dictionary<internal.HeaderRuleSet>()
        for (const id of Object.keys(patches)) {
            const oldEntity = await this.ruleSetService.read(+id, sr)
            const entity = await patchToEntity<internal.HeaderRuleSet, RewriteRuleSetRequestDto>(oldEntity, patches[id], RewriteRuleSetRequestDto)
            updates[id] = entity
        }

        return await this.ruleSetService.update(updates, sr)
    }

    @Delete(':id?')
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
