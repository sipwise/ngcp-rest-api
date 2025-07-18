import {Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Req, ValidationPipe} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {Transactional} from 'typeorm-transactional'
import {number} from 'yargs'

import {HeaderManipulationRuleActionRequestParamDto} from './dto/header-manipulation-rule-action-request-param.dto'
import {HeaderManipulationRuleActionRequestDto} from './dto/header-manipulation-rule-action-request.dto'
import {HeaderManipulationRuleActionResponseDto} from './dto/header-manipulation-rule-action-response.dto'
import {HeaderManipulationRuleActionService} from './header-manipulation-rule-action.service'

import {HeaderManipulationRuleActionSearchDto} from '~/api/header-manipulations/sets/rules/actions/dto/header-manipulation-rule-action-search.dto'
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
export class HeaderManipulationRuleActionController extends CrudController<HeaderManipulationRuleActionRequestDto, HeaderManipulationRuleActionResponseDto> {
    private readonly log = new LoggerService(HeaderManipulationRuleActionController.name)

    constructor(
        private readonly ruleActionService: HeaderManipulationRuleActionService,
        private readonly expander: ExpandHelper,
        private readonly journalService: JournalService,
    ) {
        super(resourceName, ruleActionService)
    }

    @Post(':setId?/rules/:ruleId?/actions')
    @ApiCreatedResponse(HeaderManipulationRuleActionResponseDto)
    @ApiBody({
        type: HeaderManipulationRuleActionRequestDto,
        isArray: true,
    })
    @Transactional()
    async create(
        @Body(new ParseOneOrManyPipe({items: HeaderManipulationRuleActionRequestDto})) createDto: HeaderManipulationRuleActionRequestDto[],
        @Req() req: Request,
    ): Promise<HeaderManipulationRuleActionResponseDto[]> {
        this.log.debug({
            message: 'create header rule action bulk',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const actions = await Promise.all(createDto.map(async action => action.toInternal()))
        const created = await this.ruleActionService.create(actions, sr)
        return await Promise.all(created.map(async action => new HeaderManipulationRuleActionResponseDto(action)))
    }

    @Get(':setId?/rules/:ruleId?/actions')
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(HeaderManipulationRuleActionResponseDto)
    async readAll(
        @Req() req: Request,
        @Param(new ValidationPipe()) _reqParams: HeaderManipulationRuleActionRequestParamDto): Promise<[HeaderManipulationRuleActionResponseDto[], number]> {
        this.log.debug({
            message: 'read all header rule actions',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const [entity, totalCount] =
            await this.ruleActionService.readAll(sr)
        const responseList = entity.map(e => new HeaderManipulationRuleActionResponseDto(e))
        if (sr.query.expand) {
            const setSearchDtoKeys = Object.keys(new HeaderManipulationRuleActionSearchDto())
            await this.expander.expandObjects(responseList, setSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Get(':setId?/rules/:ruleId?/actions/:id')
    async read(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request,
        @Param(new ValidationPipe()) _reqParams: HeaderManipulationRuleActionRequestParamDto = new HeaderManipulationRuleActionRequestParamDto(),
    ): Promise<HeaderManipulationRuleActionResponseDto> {
        this.log.debug({
            message: 'read header rule action by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const response = new HeaderManipulationRuleActionResponseDto(await this.ruleActionService.read(id, sr))
        if (sr.query.expand && !sr.isInternalRedirect) {
            const setSearchDtoKeys = Object.keys(new HeaderManipulationRuleActionSearchDto())
            await this.expander.expandObjects([response], setSearchDtoKeys, sr)
        }
        return response
    }

    @Put(':setId?/rules/:ruleId?/actions/:id')
    @ApiOkResponse({
        type: HeaderManipulationRuleActionResponseDto,
    })
    @Transactional()
    async update(@Param('id', ParseIntPipe) id: number,
        dto: HeaderManipulationRuleActionRequestDto,
        @Req() req: Request,
        @Param(new ValidationPipe()) _reqParams: HeaderManipulationRuleActionRequestParamDto = new HeaderManipulationRuleActionRequestParamDto(),
    ): Promise<HeaderManipulationRuleActionResponseDto> {
        this.log.debug({
            message: 'update header rule action by id',
            id: id,
            func: this.update.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)

        const updates = new Dictionary<internal.HeaderRuleAction>()
        updates[id] = Object.assign(new HeaderManipulationRuleActionRequestDto(), dto).toInternal({id: id, assignNulls:true})
        const ids = await this.ruleActionService.update(updates, sr)
        const entity = await this.ruleActionService.read(ids[0], sr)
        const response = new HeaderManipulationRuleActionResponseDto(entity)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put(':setId?/rules/:ruleId?/actions')
    @ApiPutBody(HeaderManipulationRuleActionRequestDto)
    @Transactional()
    async updateMany(
        @Body(new ParseIdDictionary({items: HeaderManipulationRuleActionRequestDto})) updates: Dictionary<HeaderManipulationRuleActionRequestDto>,
        @Req() req: Request,
        @Param(new ValidationPipe()) _reqParams: HeaderManipulationRuleActionRequestParamDto = new HeaderManipulationRuleActionRequestParamDto(),
    ): Promise<number[]> {
        this.log.debug({message: 'update header rule actions bulk', func: this.updateMany.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const actions = new Dictionary<internal.HeaderRuleAction>()
        for (const id of Object.keys(updates)) {
            const dto: HeaderManipulationRuleActionRequestDto = updates[id]
            actions[id] = dto.toInternal({id: parseInt(id), assignNulls: true})
        }
        return await this.ruleActionService.recreate(actions, sr)
    }

    @Patch(':setId?/rules/:ruleId?/actions/:id')
    @ApiConsumes('application/json-patch+json')
    @ApiBody({
        type: [PatchDto],
    })
    @Transactional()
    async adjust(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ParsePatchPipe()) patch: Operation[],
        @Req() req: Request,
        @Param(new ValidationPipe()) _reqParams: HeaderManipulationRuleActionRequestParamDto = new HeaderManipulationRuleActionRequestParamDto(),
    ): Promise<HeaderManipulationRuleActionResponseDto> {
        this.log.debug({
            message: 'patch header rule set by id',
            id: id,
            func: this.adjust.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)

        const oldEntity = await this.ruleActionService.read(id, sr)
        const entity = await patchToEntity<internal.HeaderRuleAction, HeaderManipulationRuleActionRequestDto>(oldEntity, patch, HeaderManipulationRuleActionRequestDto)
        const update = new Dictionary<internal.HeaderRuleAction>(id.toString(), entity)

        const ids = await this.ruleActionService.update(update, sr)
        const updatedEntity = await this.ruleActionService.read(ids[0], sr)
        const response = new HeaderManipulationRuleActionResponseDto(updatedEntity)
        await this.journalService.writeJournal(sr, id, response)

        return response
    }

    @Patch(':setId?/rules/:ruleId?/actions')
    @ApiConsumes('application/json-patch+json')
    @ApiPutBody(PatchDto)
    @Transactional()
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) patches: Dictionary<PatchOperation[]>,
        @Req() req: Request,
        @Param(new ValidationPipe()) _reqParams: HeaderManipulationRuleActionRequestParamDto = new HeaderManipulationRuleActionRequestParamDto(),
    ): Promise<number[]> {
        this.log.debug({
            message: 'patch header rule actions bulk',
            func: this.adjustMany.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)

        const updates = new Dictionary<internal.HeaderRuleAction>()
        for (const id of Object.keys(patches)) {
            const oldEntity = await this.ruleActionService.read(+id, sr)
            const entity = await patchToEntity<internal.HeaderRuleAction, HeaderManipulationRuleActionRequestDto>(oldEntity, patches[id], HeaderManipulationRuleActionRequestDto)
            updates[id] = entity
        }

        return await this.ruleActionService.update(updates, sr)
    }

    @Delete(':setId?/rules/:ruleId?/actions/:id')
    @ApiOkResponse({
        type: [number],
    })
    @Transactional()
    async delete(
        @ParamOrBody('id', new ParseIntIdArrayPipe()) ids: number[],
        @Req() req: Request,
        @Param(new ValidationPipe()) _reqParams: HeaderManipulationRuleActionRequestParamDto = new HeaderManipulationRuleActionRequestParamDto(),
    ): Promise<number[]> {
        this.log.debug({
            message: 'delete header rule action by id',
            id: ids,
            func: this.delete.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const deletedIds = await this.ruleActionService.delete(ids, sr)
        for (const deletedId of deletedIds) {
            await this.journalService.writeJournal(sr, deletedId, {})
        }
        return deletedIds
    }

    @Get(':setId?/rules/:ruleId?/actions/:id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, @Req() req: Request): Promise<[JournalResponseDto[], number]> {
        this.log.debug({
            message: 'read header rule action journal by id',
            id: id,
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }

}
