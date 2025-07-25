import {Body, Controller, Delete, Get, Inject, Param, ParseIntPipe, Patch, Post, Put, Req, ValidationPipe, forwardRef} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {Transactional} from 'typeorm-transactional'
import {number} from 'yargs'

import {HeaderManipulationRuleConditionRequestParamDto} from './dto/header-manipulation-rule-condition-request-param.dto'
import {HeaderManipulationRuleConditionRequestDto} from './dto/header-manipulation-rule-condition-request.dto'
import {HeaderManipulationRuleConditionResponseDto} from './dto/header-manipulation-rule-condition-response.dto'
import {HeaderManipulationRuleConditionValueResponseDto} from './dto/header-manipulation-rule-condition-value-response.dto'
import {HeaderManipulationRuleConditionService} from './header-manipulation-rule-condition.service'

import {HeaderManipulationRuleConditionSearchDto} from '~/api/header-manipulations/sets/rules/conditions/dto/header-manipulation-rule-condition-search.dto'
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
export class HeaderManipulationRuleConditionController extends CrudController<HeaderManipulationRuleConditionRequestDto, HeaderManipulationRuleConditionResponseDto> {
    private readonly log = new LoggerService(HeaderManipulationRuleConditionController.name)

    constructor(
        private readonly ruleConditionService: HeaderManipulationRuleConditionService,
        @Inject(forwardRef(() => ExpandHelper))private readonly expander: ExpandHelper,
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
    @Transactional()
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
        return await Promise.all(created.map(
            async condition => new HeaderManipulationRuleConditionResponseDto(
                condition,
                {url: req.url},
            )),
        )
    }

    @Get(':setId?/rules/:ruleId?/conditions')
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(HeaderManipulationRuleConditionResponseDto)
    async readAll(
        @Req() req: Request,
        @Param(new ValidationPipe()) _reqParams: HeaderManipulationRuleConditionRequestParamDto): Promise<[HeaderManipulationRuleConditionResponseDto[], number]> {
        this.log.debug({
            message: 'read all header rule conditions',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const [entity, totalCount] =
            await this.ruleConditionService.readAll(sr)
        const responseList = entity.map(e => new HeaderManipulationRuleConditionResponseDto(
            e,
            {url: req.url},
        ))

        if (sr.query.expand && !sr.isInternalRedirect) {
            const keys = Object.keys(new HeaderManipulationRuleConditionSearchDto())
            await this.expander.expandObjects(responseList, keys, sr)
        }

        return [responseList, totalCount]
    }

    @Get(':setId?/rules/:ruleId?/conditions/:id')
    async read(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request,
        @Param(new ValidationPipe()) _reqParams: HeaderManipulationRuleConditionRequestParamDto,
    ): Promise<HeaderManipulationRuleConditionResponseDto> {
        this.log.debug({
            message: 'read header rule condition by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const response = new HeaderManipulationRuleConditionResponseDto(
            await this.ruleConditionService.read(id, sr),
            {url: req.url, containsResourceId: true},
        )
        if (sr.query.expand && !sr.isInternalRedirect) {
            const keys = Object.keys(new HeaderManipulationRuleConditionSearchDto())
            await this.expander.expandObjects([response], keys, sr)
        }

        return response
    }

    @Put(':setId?/rules/:ruleId?/conditions/:id')
    @ApiOkResponse({
        type: HeaderManipulationRuleConditionResponseDto,
    })
    @Transactional()
    async update(@Param('id', ParseIntPipe) id: number,
        dto: HeaderManipulationRuleConditionRequestDto,
        @Req() req: Request,
        @Param(new ValidationPipe()) _reqParams: HeaderManipulationRuleConditionRequestParamDto,
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
        const response = new HeaderManipulationRuleConditionResponseDto(
            entity,
            {url: req.url, containsResourceId: true},
        )
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put(':setId?/rules/:ruleId?/conditions')
    @ApiPutBody(HeaderManipulationRuleConditionRequestDto)
    @Transactional()
    async updateMany(
        @Body(new ParseIdDictionary({items: HeaderManipulationRuleConditionRequestDto})) updates: Dictionary<HeaderManipulationRuleConditionRequestDto>,
        @Req() req: Request,
        @Param(new ValidationPipe()) _reqParams: HeaderManipulationRuleConditionRequestParamDto,
    ): Promise<number[]> {
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
    @Transactional()
    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ParsePatchPipe()) patch: Operation[],
        @Req() req: Request,
        @Param(new ValidationPipe()) _reqParams: HeaderManipulationRuleConditionRequestParamDto,
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
        const response = new HeaderManipulationRuleConditionResponseDto(
            updatedEntity,
            {url: req.url, containsResourceId: true},
        )
        await this.journalService.writeJournal(sr, id, response)

        return response
    }

    @Patch(':setId?/rules/:ruleId?/conditions')
    @ApiConsumes('application/json-patch+json')
    @ApiPutBody(PatchDto)
    @Transactional()
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) patches: Dictionary<PatchOperation[]>,
        @Req() req: Request,
        @Param(new ValidationPipe()) _reqParams: HeaderManipulationRuleConditionRequestParamDto,
    ): Promise<number[]> {
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
    @Transactional()
    async delete(
        @ParamOrBody('id', new ParseIntIdArrayPipe()) ids: number[],
        @Req() req: Request,
        @Param(new ValidationPipe()) _reqParams: HeaderManipulationRuleConditionRequestParamDto,
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
        @Param(new ValidationPipe()) _reqParams: HeaderManipulationRuleConditionRequestParamDto,
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
    async journal(@Param('id') id: number | string, @Req() req: Request): Promise<[JournalResponseDto[], number]> {
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
