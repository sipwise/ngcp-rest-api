import {Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Req, ValidationPipe} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {Transactional} from 'typeorm-transactional'
import {number} from 'yargs'

import {PeeringInboundRuleRequestDto} from './dto/peering-inbound-rule-request.dto'
import {PeeringInboundRuleRequestParamDto} from './dto/peering-inbound-rule-request.param.dto'
import {PeeringInboundRuleResponseDto} from './dto/peering-inbound-rule-response.dto'
import {PeeringInboundRuleService} from './peering-inbound-rule.service'

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
export class PeeringInboundRuleController extends CrudController<PeeringInboundRuleRequestDto, PeeringInboundRuleResponseDto> {
    private readonly log = new LoggerService(PeeringInboundRuleController.name)

    constructor(
        private readonly ruleService: PeeringInboundRuleService,
        private readonly journalService: JournalService,
    ) {
        super(resourceName, ruleService)
    }

    @Post(':groupId?/inbound-rules')
    @ApiCreatedResponse(PeeringInboundRuleResponseDto)
    @ApiBody({
        type: PeeringInboundRuleRequestDto,
        isArray: true,
    })
    @Transactional()
    async create(
        @Body(new ParseOneOrManyPipe({items: PeeringInboundRuleRequestDto})) createDto: PeeringInboundRuleRequestDto[],
        @Req() req: Request,
    ): Promise<PeeringInboundRuleResponseDto[]> {
        this.log.debug({
            message: 'create peering rule bulk',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const rules = await Promise.all(createDto.map(async set => set.toInternal()))
        const created = await this.ruleService.create(rules, sr)
        return await Promise.all(created.map(async server => new PeeringInboundRuleResponseDto(
            server,
            {url: req.url},
        )))
    }

    @Get(':groupId?/inbound-rules')
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(PeeringInboundRuleResponseDto)
    async readAll(
        @Req() req: Request,
        @Param(new ValidationPipe()) _reqParams: PeeringInboundRuleRequestParamDto): Promise<[PeeringInboundRuleResponseDto[], number]> {
        this.log.debug({
            message: 'read all peering rules across all groups',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const [entity, totalCount] =
            await this.ruleService.readAll(sr)
        const responseList = entity.map(e => new PeeringInboundRuleResponseDto(
            e,
            {url: req.url},
        ))
        return [responseList, totalCount]
    }

    @Get(':groupId?/inbound-rules/:id')
    @ApiOkResponse({
        type: PeeringInboundRuleResponseDto,
    })
    async read(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request,
        // TODO: _Prefix does not work here, fix?
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        @Param(new ValidationPipe()) {groupId}: PeeringInboundRuleRequestParamDto = new PeeringInboundRuleRequestParamDto(),
    ): Promise<PeeringInboundRuleResponseDto> {
        this.log.debug({
            message: 'read peering rule by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        return new PeeringInboundRuleResponseDto(
            await this.ruleService.read(id, new ServiceRequest(req)),
            {url: req.url, containsResourceId: true},
        )
    }

    @Put(':groupId?/inbound-rules/:id')
    @ApiOkResponse({
        type: PeeringInboundRuleResponseDto,
    })
    @Transactional()
    async update(@Param('id', ParseIntPipe) id: number,
        dto: PeeringInboundRuleRequestDto,
        @Req() req: Request,
        // TODO: _Prefix does not work here, fix?
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        @Param(new ValidationPipe()) {groupId}: PeeringInboundRuleRequestParamDto = new PeeringInboundRuleRequestParamDto(),
    ): Promise<PeeringInboundRuleResponseDto> {
        this.log.debug({
            message: 'update peering rule by id',
            id: id,
            func: this.update.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.VoipPeeringInboundRule>()
        updates[id] = Object.assign(new PeeringInboundRuleRequestDto(), dto).toInternal({id: id, assignNulls: true})
        const ids = await this.ruleService.update(updates, sr)
        const entity = await this.ruleService.read(ids[0], sr)
        const response = new PeeringInboundRuleResponseDto(
            entity,
            {url: req.url, containsResourceId: true},
        )
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put(':groupId?/inbound-rules')
    @ApiPutBody(PeeringInboundRuleRequestDto)
    @Transactional()
    async updateMany(
        @Body(new ParseIdDictionary({items: PeeringInboundRuleRequestDto})) updates: Dictionary<PeeringInboundRuleRequestDto>,
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({message: 'update peering rule Sets bulk', func: this.updateMany.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const sets = new Dictionary<internal.VoipPeeringInboundRule>()
        for (const id of Object.keys(updates)) {
            const dto: PeeringInboundRuleRequestDto = updates[id]
            sets[id] = dto.toInternal({id: parseInt(id), assignNulls: true})
        }
        return await this.ruleService.update(sets, sr)
    }

    @Patch(':groupId?/inbound-rules/:id')
    @ApiConsumes('application/json-patch+json')
    @ApiBody({
        type: [PatchDto],
    })
    @Transactional()
    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ParsePatchPipe()) patch: Operation[],
        @Req() req: Request,
    ): Promise<PeeringInboundRuleResponseDto> {
        this.log.debug({
            message: 'patch peering rule set by id',
            id: id,
            func: this.adjust.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)

        const oldEntity = await this.ruleService.read(id, sr)
        const entity = await patchToEntity<internal.VoipPeeringInboundRule, PeeringInboundRuleRequestDto>(oldEntity, patch, PeeringInboundRuleRequestDto)
        const update = new Dictionary<internal.VoipPeeringInboundRule>(id.toString(), entity)

        const ids = await this.ruleService.update(update, sr)
        const updatedEntity = await this.ruleService.read(ids[0], sr)
        const response = new PeeringInboundRuleResponseDto(
            updatedEntity,
            {url: req.url, containsResourceId: true},
        )
        await this.journalService.writeJournal(sr, id, response)

        return response
    }

    @Patch(':groupId?/inbound-rules')
    @ApiConsumes('application/json-patch+json')
    @ApiPutBody(PatchDto)
    @Transactional()
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) patches: Dictionary<PatchOperation[]>,
        @Req() req: Request,
    ): Promise<number[]> {
        const sr = new ServiceRequest(req)

        const updates = new Dictionary<internal.VoipPeeringInboundRule>()
        for (const id of Object.keys(patches)) {
            const oldEntity = await this.ruleService.read(+id, sr)
            const entity = await patchToEntity<internal.VoipPeeringInboundRule, PeeringInboundRuleRequestDto>(oldEntity, patches[id], PeeringInboundRuleRequestDto)
            updates[id] = entity
        }

        return await this.ruleService.update(updates, sr)
    }

    @Delete(':groupId?/inbound-rules/:id?')
    @ApiOkResponse({
        type: [number],
    })
    @Transactional()
    async delete(
        @ParamOrBody('id', new ParseIntIdArrayPipe()) ids: number[],
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({
            message: 'delete peering rule set by id',
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

    @Get(':groupId?/inbound-rules/:id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, @Req() req: Request): Promise<[JournalResponseDto[], number]> {
        this.log.debug({
            message: 'read peering rule journal by id',
            id: id,
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }
}
