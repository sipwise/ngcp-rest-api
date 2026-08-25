import {Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Req, ValidationPipe} from '@nestjs/common'
import {ApiBody, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {NCOSSetLevelRequestParamDto} from './dto/level-request-param.dto'
import {NCOSSetLevelRequestDto} from './dto/level-request.dto'
import {NCOSSetLevelResponseDto} from './dto/level-response.dto'
import {NCOSSetLevelService} from './level.service'

import {JournalResponseDto} from '~/api/journals/dto/journal-response.dto'
import {JournalService} from '~/api/journals/journal.service'
import {RbacRole} from '~/config/constants.config'
import {CrudController} from '~/controllers/crud.controller'
import {ApiCreatedResponse} from '~/decorators/api-created-response.decorator'
import {ApiPaginatedResponse} from '~/decorators/api-paginated-response.decorator'
import {Auth} from '~/decorators/auth.decorator'
import {ParamOrBody} from '~/decorators/param-or-body.decorator'
import {Transactional} from '~/decorators/transactional.decorator'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIntIdArrayPipe} from '~/pipes/parse-int-id-array.pipe'
import {ParseOneOrManyPipe} from '~/pipes/parse-one-or-many.pipe'

const resourceName = 'ncos/sets'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
)
@ApiTags('NCOS')
@Controller(resourceName)
export class NCOSSetLevelController extends CrudController<NCOSSetLevelRequestDto, NCOSSetLevelResponseDto> {
    private readonly log = new LoggerService(NCOSSetLevelController.name)

    constructor(
        private readonly ncosSetLevelService: NCOSSetLevelService,
        private readonly journalService: JournalService,
    ) {
        super(resourceName, ncosSetLevelService)
    }

    @Post('{:setId/}levels')
    @ApiCreatedResponse(NCOSSetLevelResponseDto)
    @ApiBody({
        type: NCOSSetLevelRequestDto,
        isArray: true,
    })
    @Transactional()
    async create(
        @Body(new ParseOneOrManyPipe({items: NCOSSetLevelRequestDto})) createDto: NCOSSetLevelRequestDto[],
        @Req() req: Request,
    ): Promise<NCOSSetLevelResponseDto[]> {
        this.log.debug({
            message: 'create ncos set level bulk',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const reqDtoOptions = {parentId: +sr.params['setId']}
        const entities = await Promise.all(createDto.map(async dto => dto.toInternal(reqDtoOptions)))
        const created = await this.ncosSetLevelService.create(entities, sr)
        return await Promise.all(created.map(async entity => new NCOSSetLevelResponseDto(entity)))
    }

    @Get('{:setId/}levels')
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(NCOSSetLevelResponseDto)
    async readAll(
        @Req() req: Request,
        @Param(new ValidationPipe()) _reqParams: NCOSSetLevelRequestParamDto,
    ): Promise<[NCOSSetLevelResponseDto[], number]> {
        this.log.debug({
            message: 'read all ncos set levels',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const [entity, totalCount] =
            await this.ncosSetLevelService.readAll(sr)
        const responseList = entity.map(e => new NCOSSetLevelResponseDto(e))
        return [responseList, totalCount]
    }

    @Get('{:setId/}levels/:id')
    @ApiOkResponse({
        type: NCOSSetLevelResponseDto,
    })
    async read(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request,
        // TODO: _Prefix does not work here, fix?
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        @Param(new ValidationPipe()) {setId}: NCOSSetLevelRequestParamDto = new NCOSSetLevelRequestParamDto(),
    ): Promise<NCOSSetLevelResponseDto> {
        this.log.debug({
            message: 'read ncos set level by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        const entity = await this.ncosSetLevelService.read(id, new ServiceRequest(req))
        return new NCOSSetLevelResponseDto(entity)
    }

    @Delete('{:setId/}levels{/:id}')
    @ApiOkResponse({
        type: [Number],
    })
    @Transactional()
    async delete(
        @ParamOrBody('id', new ParseIntIdArrayPipe()) ids: number[],
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({
            message: 'delete ncos set level by id',
            id: ids,
            func: this.delete.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const deletedIds = await this.ncosSetLevelService.delete(ids, sr)
        for (const deletedId of deletedIds) {
            await this.journalService.writeJournal(sr, deletedId, {})
        }
        return deletedIds
    }

    @Get('{:setId/}levels/:id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, @Req() req: Request): Promise<[JournalResponseDto[], number]> {
        this.log.debug({
            message: 'read ncos set level journal by id',
            id: id,
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }
}
