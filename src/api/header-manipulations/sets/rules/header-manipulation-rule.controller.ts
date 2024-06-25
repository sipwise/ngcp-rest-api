import {Body, Controller, Delete, Get, Optional, Param, ParseIntPipe, Patch, Post, Put, Req, UnprocessableEntityException, ValidationPipe} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiExtraModels, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {Operation} from 'helpers/patch.helper'
import {RbacRole} from '../../../../config/constants.config'
import {CrudController} from '../../../../controllers/crud.controller'
import {ApiCreatedResponse} from '../../../../decorators/api-created-response.decorator'
import {ApiPaginatedResponse} from '../../../../decorators/api-paginated-response.decorator'
import {Auth} from '../../../../decorators/auth.decorator'
import {SearchLogic} from '../../../../helpers/search-logic.helper'
import {ServiceRequest} from '../../../../interfaces/service-request.interface'
import {LoggerService} from '../../../../logger/logger.service'
import {CreateResponseDto} from '../../../../dto/create-response.dto'
import {PaginatedDto} from '../../../../dto/paginated.dto'
import {PatchDto} from '../../../../dto/patch.dto'
import {ParseOneOrManyPipe} from '../../../../pipes/parse-one-or-many.pipe'
import {number} from 'yargs'
import {ParseIntIdArrayPipe} from '../../../../pipes/parse-int-id-array.pipe'
import {ParamOrBody} from '../../../../decorators/param-or-body.decorator'
import {internal} from '../../../../entities'
import {ApiPutBody} from '../../../../decorators/api-put-body.decorator'
import {ParseIdDictionary} from '../../../../pipes/parse-id-dictionary.pipe'
import {Dictionary} from '../../../../helpers/dictionary.helper'
import {patchToEntity, Operation as PatchOperation} from '../../../../helpers/patch.helper'
import {ParsePatchPipe} from '../../../../pipes/parse-patch.pipe'
import {HeaderManipulationRuleService} from './header-manipulation-rule.service'
import {HeaderManipulationRuleResponseDto} from './dto/header-manipulation-rule-response.dto'
import {HeaderManipulationRuleRequestDto} from './dto/header-manipulation-rule-request.dto'
import {JournalService} from '../../../../api/journals/journal.service'
import {JournalResponseDto} from '../../../../api/journals/dto/journal-response.dto'
import {HeaderRuleRequestParamDto} from './dto/header-manipulation-rule-request-param.dto'

const resourceName = 'header-manipulations/sets'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
)
@ApiTags('HeaderManipulation')
@ApiExtraModels(CreateResponseDto, PaginatedDto)
@Controller(resourceName)
export class HeaderManipulationRuleController extends CrudController<HeaderManipulationRuleRequestDto, HeaderManipulationRuleResponseDto> {
    private readonly log = new LoggerService(HeaderManipulationRuleController.name)

    constructor(
        private readonly ruleService: HeaderManipulationRuleService,
        private readonly journalService: JournalService,
    ) {
        super(resourceName, ruleService)
    }

    /* Rule Set */

    @Post(':setId?/rules')
    @ApiCreatedResponse(HeaderManipulationRuleResponseDto)
    @ApiBody({
        type: HeaderManipulationRuleRequestDto,
        isArray: true,
    })
    async create(
        @Body(new ParseOneOrManyPipe({items: HeaderManipulationRuleRequestDto})) createDto: HeaderManipulationRuleRequestDto[],
        @Req() req: Request,
    ): Promise<HeaderManipulationRuleResponseDto[]> {
        this.log.debug({
            message: 'create header rule bulk',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const sets = await Promise.all(createDto.map(async set => set.toInternal()))
        const created = await this.ruleService.create(sets, sr)
        return await Promise.all(created.map(async set => new HeaderManipulationRuleResponseDto(req.url, set)))
    }

    @Get(':setId?/rules')
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(HeaderManipulationRuleResponseDto)
    async readAll(
        @Req() req: Request,
        @Param(new ValidationPipe()) reqParams: HeaderRuleRequestParamDto): Promise<[HeaderManipulationRuleResponseDto[], number]> {
        this.log.debug({
            message: 'read all header rules across all rule sets',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const [entity, totalCount] =
            await this.ruleService.readAll(sr)
        const responseList = entity.map(e => new HeaderManipulationRuleResponseDto(req.url, e))
        return [responseList, totalCount]
    }

    @Get(':setId?/rules/:id')
    @ApiOkResponse({
        type: HeaderManipulationRuleResponseDto,
    })
    async read(
        @Param('id', ParseIntPipe) id: number, req: Request,
        @Param(new ValidationPipe()) {setId}: HeaderRuleRequestParamDto = new HeaderRuleRequestParamDto(),
    ): Promise<HeaderManipulationRuleResponseDto> {
        this.log.debug({
            message: 'read header rule by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        return new HeaderManipulationRuleResponseDto(
            req.url,
            await this.ruleService.read(id, new ServiceRequest(req)),
        )
    }

    @Put(':setId?/rules/:id')
    @ApiOkResponse({
        type: HeaderManipulationRuleResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number,
        dto: HeaderManipulationRuleRequestDto,
        req: Request,
        @Param(new ValidationPipe()) {setId}: HeaderRuleRequestParamDto = new HeaderRuleRequestParamDto(),  
    ): Promise<HeaderManipulationRuleResponseDto> {
        this.log.debug({
            message: 'update header rule by id',
            id: id,
            func: this.update.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.HeaderRule>()
        updates[id] = Object.assign(new HeaderManipulationRuleRequestDto(), dto).toInternal({id: id})
        const ids = await this.ruleService.update(updates, sr)
        const entity = await this.ruleService.read(ids[0], sr)
        const response = new HeaderManipulationRuleResponseDto(req.url, entity)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put(':setId?/rules')
    @ApiPutBody(HeaderManipulationRuleRequestDto)
    async updateMany(
        @Body(new ParseIdDictionary({items: HeaderManipulationRuleRequestDto})) updates: Dictionary<HeaderManipulationRuleRequestDto>,
        @Req() req,
    ) {
        this.log.debug({message: 'update header rule Sets bulk', func: this.updateMany.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const sets = new Dictionary<internal.HeaderRule>()
        for (const id of Object.keys(updates)) {
            const dto: HeaderManipulationRuleRequestDto = updates[id]
            sets[id] = dto.toInternal({id: parseInt(id)})
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
            req: Request,
    ): Promise<HeaderManipulationRuleResponseDto> {
        this.log.debug({
            message: 'patch header rule set by id',
            id: id,
            func: this.adjust.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)

        const oldEntity = await this.ruleService.read(id, sr)
        const entity = await patchToEntity<internal.HeaderRule, HeaderManipulationRuleRequestDto>(oldEntity, patch, HeaderManipulationRuleRequestDto)
        const update = new Dictionary<internal.HeaderRule>(id.toString(), entity)

        const ids = await this.ruleService.update(update, sr)
        const updatedEntity = await this.ruleService.read(ids[0], sr)
        const response = new HeaderManipulationRuleResponseDto(req.url, updatedEntity)
        await this.journalService.writeJournal(sr, id, response)

        return response
    }

    @Patch(':setId?/rules')
    @ApiConsumes('application/json-patch+json')
    @ApiPutBody(PatchDto)
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) patches: Dictionary<PatchOperation[]>,
        @Req() req,
    ) {
        const sr = new ServiceRequest(req)

        const updates = new Dictionary<internal.HeaderRule>()
        for (const id of Object.keys(patches)) {
            const oldEntity = await this.ruleService.read(+id, sr)
            const entity = await patchToEntity<internal.HeaderRule, HeaderManipulationRuleRequestDto>(oldEntity, patches[id], HeaderManipulationRuleRequestDto)
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
            message: 'delete header rule set by id',
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
    async journal(@Param('id') id: number | string, @Req() req: Request) {
        this.log.debug({
            message: 'read header rule journal by id',
            id: id,
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }
}
