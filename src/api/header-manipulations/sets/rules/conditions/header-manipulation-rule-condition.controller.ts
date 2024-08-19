import {Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Req, UnprocessableEntityException, ValidationPipe} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {Operation} from '../../../../../helpers/patch.helper'
import {CrudController} from '../../../../../controllers/crud.controller'
import {ApiCreatedResponse} from '../../../../../decorators/api-created-response.decorator'
import {ApiPaginatedResponse} from '../../../../../decorators/api-paginated-response.decorator'
import {Auth} from '../../../../../decorators/auth.decorator'
import {SearchLogic} from '../../../../../helpers/search-logic.helper'
import {ServiceRequest} from '../../../../../interfaces/service-request.interface'
import {LoggerService} from '../../../../../logger/logger.service'
import {PatchDto} from '../../../../../dto/patch.dto'
import {ParseOneOrManyPipe} from '../../../../../pipes/parse-one-or-many.pipe'
import {ParseIntIdArrayPipe} from '../../../../../pipes/parse-int-id-array.pipe'
import {ParamOrBody} from '../../../../../decorators/param-or-body.decorator'
import {internal} from '../../../../../entities'
import {ApiPutBody} from '../../../../../decorators/api-put-body.decorator'
import {ParseIdDictionary} from '../../../../../pipes/parse-id-dictionary.pipe'
import {Dictionary} from '../../../../../helpers/dictionary.helper'
import {patchToEntity, Operation as PatchOperation} from '../../../../../helpers/patch.helper'
import {ParsePatchPipe} from '../../../../../pipes/parse-patch.pipe'
import {HeaderManipulationRuleConditionService} from './header-manipulation-rule-condition.service'
import {HeaderManipulationRuleConditionResponseDto} from './dto/header-manipulation-rule-condition-response.dto'
import {HeaderManipulationRuleConditionRequestDto} from './dto/header-manipulation-rule-condition-request.dto'
import {JournalService} from '../../../../journals/journal.service'
import {JournalResponseDto} from '../../../../journals/dto/journal-response.dto'
import {HeaderManipulationRuleConditionRequestParamDto} from './dto/header-manipulation-rule-condition-request-param.dto'
import {number} from 'yargs'
import {HeaderManipulationRuleConditionValueResponseDto} from './dto/header-manipulation-rule-condition-value-response.dto'
import {License as LicenseType, RbacRole} from '../../../../../config/constants.config'
import {License} from '../../../../../decorators/license.decorator'

const resourceName = 'header-manipulations/sets'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
)
@ApiTags('HeaderManipulation')
@Controller(resourceName)
@License(LicenseType.headerManipulation)
export class HeaderManipulationRuleConditionController extends CrudController<HeaderManipulationRuleConditionRequestDto, HeaderManipulationRuleConditionResponseDto> {
    private readonly log = new LoggerService(HeaderManipulationRuleConditionController.name)

    constructor(
        private readonly ruleConditionService: HeaderManipulationRuleConditionService,
        private readonly journalService: JournalService,
    ) {
        super(resourceName, ruleConditionService)
    }

    @Post(':setId?/rules/:ruleId?/conditions')
    @ApiCreatedResponse(HeaderManipulationRuleConditionResponseDto)
    @ApiBody({
        type: HeaderManipulationRuleConditionRequestDto,
        isArray: true,
    })
    async create(
        @Body(new ParseOneOrManyPipe({items: HeaderManipulationRuleConditionRequestDto})) createDto: HeaderManipulationRuleConditionRequestDto[],
        @Req() req: Request,
    ): Promise<HeaderManipulationRuleConditionResponseDto[]> {
        this.log.debug({
            message: 'create header rule condition bulk',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const conditions = await Promise.all(createDto.map(async condition => condition.toInternal()))
        const created = await this.ruleConditionService.create(conditions, sr)
        return await Promise.all(created.map(async condition => new HeaderManipulationRuleConditionResponseDto(condition)))
    }

    @Get(':setId?/rules/:ruleId?/conditions')
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(HeaderManipulationRuleConditionResponseDto)
    async readAll(
        @Req() req: Request,
        @Param(new ValidationPipe()) reqParams: HeaderManipulationRuleConditionRequestParamDto): Promise<[HeaderManipulationRuleConditionResponseDto[], number]> {
        this.log.debug({
            message: 'read all header rule conditions',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const [entity, totalCount] =
            await this.ruleConditionService.readAll(sr)
        const responseList = entity.map(e => new HeaderManipulationRuleConditionResponseDto(e))
        return [responseList, totalCount]
    }

    @Get(':setId?/rules/:ruleId?/conditions/:id')
    async read(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request,
        @Param(new ValidationPipe()) reqParams: HeaderManipulationRuleConditionRequestParamDto,
    ): Promise<HeaderManipulationRuleConditionResponseDto> {
        this.log.debug({
            message: 'read header rule condition by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        return new HeaderManipulationRuleConditionResponseDto(
            await this.ruleConditionService.read(id, new ServiceRequest(req)),
        )
    }

    @Put(':setId?/rules/:ruleId?/conditions/:id')
    @ApiOkResponse({
        type: HeaderManipulationRuleConditionResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number,
        dto: HeaderManipulationRuleConditionRequestDto,
        @Req() req: Request,
        @Param(new ValidationPipe()) reqParams: HeaderManipulationRuleConditionRequestParamDto,
    ): Promise<HeaderManipulationRuleConditionResponseDto> {
        this.log.debug({
            message: 'update header rule condition by id',
            id: id,
            func: this.update.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.HeaderRuleCondition>()
        updates[id] = Object.assign(new HeaderManipulationRuleConditionRequestDto(), dto).toInternal({id: id, assignNulls: true})
        const ids = await this.ruleConditionService.update(updates, sr)
        const entity = await this.ruleConditionService.read(ids[0], sr)
        const response = new HeaderManipulationRuleConditionResponseDto(entity)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put(':setId?/rules/:ruleId?/conditions')
    @ApiPutBody(HeaderManipulationRuleConditionRequestDto)
    async updateMany(
        @Body(new ParseIdDictionary({items: HeaderManipulationRuleConditionRequestDto})) updates: Dictionary<HeaderManipulationRuleConditionRequestDto>,
        @Req() req,
        @Param(new ValidationPipe()) reqParams: HeaderManipulationRuleConditionRequestParamDto,
    ) {
        this.log.debug({message: 'update header rule conditions bulk', func: this.updateMany.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const conditions = new Dictionary<internal.HeaderRuleCondition>()
        for (const id of Object.keys(updates)) {
            const dto: HeaderManipulationRuleConditionRequestDto = updates[id]
            conditions[id] = dto.toInternal({id: parseInt(id), assignNulls: true})
        }
        return await this.ruleConditionService.update(conditions, sr)
    }

    @Patch(':setId?/rules/:ruleId?/conditions/:id')
    @ApiConsumes('application/json-patch+json')
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ParsePatchPipe()) patch: Operation[],
        @Req() req: Request,
        @Param(new ValidationPipe()) reqParams: HeaderManipulationRuleConditionRequestParamDto,
    ): Promise<HeaderManipulationRuleConditionResponseDto> {
        this.log.debug({
            message: 'patch header rule condition by id',
            id: id,
            func: this.adjust.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)

        const oldEntity = await this.ruleConditionService.read(id, sr)
        const entity = await patchToEntity<internal.HeaderRuleCondition, HeaderManipulationRuleConditionRequestDto>(oldEntity, patch, HeaderManipulationRuleConditionRequestDto)
        const update = new Dictionary<internal.HeaderRuleCondition>(id.toString(), entity)

        const ids = await this.ruleConditionService.update(update, sr)
        const updatedEntity = await this.ruleConditionService.read(ids[0], sr)
        const response = new HeaderManipulationRuleConditionResponseDto(updatedEntity)
        await this.journalService.writeJournal(sr, id, response)

        return response
    }

    @Patch(':setId?/rules/:ruleId?/conditions')
    @ApiConsumes('application/json-patch+json')
    @ApiPutBody(PatchDto)
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) patches: Dictionary<PatchOperation[]>,
        @Req() req,
        @Param(new ValidationPipe()) reqParams: HeaderManipulationRuleConditionRequestParamDto,
    ) {
        this.log.debug({
            message: 'patch header rule conditions bulk',
            func: this.adjustMany.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)

        const updates = new Dictionary<internal.HeaderRuleCondition>()
        for (const id of Object.keys(patches)) {
            const oldEntity = await this.ruleConditionService.read(+id, sr)
            const entity = await patchToEntity<internal.HeaderRuleCondition, HeaderManipulationRuleConditionRequestDto>(oldEntity, patches[id], HeaderManipulationRuleConditionRequestDto)
            updates[id] = entity
        }

        return await this.ruleConditionService.update(updates, sr)
    }

    @Delete(':setId?/rules/:ruleId?/conditions/:id')
    @ApiOkResponse({
        type: [number],
    })
    async delete(
        @ParamOrBody('id', new ParseIntIdArrayPipe()) ids: number[],
        @Req() req: Request,
        @Param(new ValidationPipe()) reqParams: HeaderManipulationRuleConditionRequestParamDto,
    ): Promise<number[]> {
        this.log.debug({
            message: 'delete header rule condition by id',
            id: ids,
            func: this.delete.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const deletedIds = await this.ruleConditionService.delete(ids, sr)
        for (const deletedId of deletedIds) {
            await this.journalService.writeJournal(sr, deletedId, {})
        }
        return deletedIds
    }

    @Get(':setId?/rules/:ruleId?/conditions/:id/@values')
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(HeaderManipulationRuleConditionValueResponseDto)
    async readConditionValues(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request,
        @Param(new ValidationPipe()) reqParams: HeaderManipulationRuleConditionRequestParamDto,
    ): Promise<[HeaderManipulationRuleConditionValueResponseDto[], number]> {
        this.log.debug({
            message: 'read header rule condition values',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })

        const [entity, totalCount] =
            await this.ruleConditionService.readAllConditionValues(id, new ServiceRequest(req))
        const responseList = entity.map(e => new HeaderManipulationRuleConditionValueResponseDto(e))
        return [responseList, totalCount]
    }

    @Get(':setId?/rules/:ruleId?/conditions/:id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, @Req() req: Request) {
        this.log.debug({
            message: 'read header rule condition journal by id',
            id: id,
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }

}
