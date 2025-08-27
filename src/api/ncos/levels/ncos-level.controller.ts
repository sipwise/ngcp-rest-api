import {Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Req} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {Operation} from 'helpers/patch.helper'
import {Transactional} from 'typeorm-transactional'
import {number} from 'yargs'

import {NCOSLevelRequestDto} from './dto/ncos-level-request.dto'
import {NCOSLevelResponseDto} from './dto/ncos-level-response.dto'
import {NCOSLevelService} from './ncos-level.service'

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
import {Operation as PatchOperation,patchToEntity} from '~/helpers/patch.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {ParseIdDictionary} from '~/pipes/parse-id-dictionary.pipe'
import {ParseIntIdArrayPipe} from '~/pipes/parse-int-id-array.pipe'
import {ParseOneOrManyPipe} from '~/pipes/parse-one-or-many.pipe'
import {ParsePatchPipe} from '~/pipes/parse-patch.pipe'

const resourceName = 'ncos/levels'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
)
@ApiTags('NCOS')
@Controller(resourceName)
export class NCOSLevelController extends CrudController<NCOSLevelRequestDto, NCOSLevelResponseDto> {
    private readonly log = new LoggerService(NCOSLevelController.name)

    constructor(
        private readonly ncosLevelService: NCOSLevelService,
        private readonly journalService: JournalService,
    ) {
        super(resourceName, ncosLevelService, journalService)
    }

    @Post()
    @ApiCreatedResponse(NCOSLevelResponseDto)
    @ApiBody({
        type: NCOSLevelRequestDto,
        isArray: true,
    })
    @Transactional()
    async create(
        @Body(new ParseOneOrManyPipe({items: NCOSLevelRequestDto})) createDto: NCOSLevelRequestDto[],
        @Req() req: Request,
    ): Promise<NCOSLevelResponseDto[]> {
        this.log.debug({
            message: 'create ncos level bulk',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const sets = await Promise.all(createDto.map(async set => set.toInternal()))
        const created = await this.ncosLevelService.create(sets, sr)
        return await Promise.all(created.map(async set => new NCOSLevelResponseDto(
            set,
            {url: req.url},
        )))
    }

    @Auth(
        RbacRole.system,
        RbacRole.admin,
        RbacRole.reseller,
        RbacRole.subscriberadmin,
    )
    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(NCOSLevelResponseDto)
    async readAll(@Req() req: Request): Promise<[NCOSLevelResponseDto[], number]> {
        this.log.debug({
            message: 'read all ncos level',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const [entity, totalCount] =
            await this.ncosLevelService.readAll(sr)
        const responseList = entity.map(e => new NCOSLevelResponseDto(
            e,
            {url: req.url},
        ))
        return [responseList, totalCount]
    }

    @Auth(
        RbacRole.system,
        RbacRole.admin,
        RbacRole.reseller,
        RbacRole.subscriberadmin,
    )
    @Get(':id')
    @ApiOkResponse({
        type: NCOSLevelResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, req: Request): Promise<NCOSLevelResponseDto> {
        this.log.debug({
            message: 'read ncos level by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        return new NCOSLevelResponseDto(
            await this.ncosLevelService.read(id, new ServiceRequest(req)),
            {url: req.url, containsResourceId: true},
        )
    }

    @Put(':id')
    @ApiOkResponse({
        type: NCOSLevelResponseDto,
    })
    @Transactional()
    async update(@Param('id', ParseIntPipe) id: number, dto: NCOSLevelRequestDto, req: Request): Promise<NCOSLevelResponseDto> {
        this.log.debug({
            message: 'update ncos level by id',
            id: id,
            func: this.update.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.NCOSLevel>()
        updates[id] = Object.assign(new NCOSLevelRequestDto(), dto).toInternal({id: id, assignNulls: true})
        const ids = await this.ncosLevelService.update(updates, sr)
        const entity = await this.ncosLevelService.read(ids[0], sr)
        const response = new NCOSLevelResponseDto(
            entity,
            {url: req.url, containsResourceId: true},
        )
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put()
    @ApiPutBody(NCOSLevelRequestDto)
    @Transactional()
    async updateMany(
        @Body(new ParseIdDictionary({items: NCOSLevelRequestDto})) updates: Dictionary<NCOSLevelRequestDto>,
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({message: 'update NCOS levels bulk', func: this.updateMany.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const sets = new Dictionary<internal.NCOSLevel>()
        for (const id of Object.keys(updates)) {
            const dto: NCOSLevelRequestDto = updates[id]
            sets[id] = dto.toInternal({id: parseInt(id), assignNulls: true})
        }
        return await this.ncosLevelService.update(sets, sr)
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
    ): Promise<NCOSLevelResponseDto> {
        this.log.debug({
            message: 'patch ncos level by id',
            id: id,
            func: this.adjust.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)

        const oldEntity = await this.ncosLevelService.read(id, sr)
        const entity = await patchToEntity<internal.NCOSLevel, NCOSLevelRequestDto>(oldEntity, patch, NCOSLevelRequestDto)
        const update = new Dictionary<internal.NCOSLevel>(id.toString(), entity)

        const ids = await this.ncosLevelService.update(update, sr)
        const updatedEntity = await this.ncosLevelService.read(ids[0], sr)
        const response = new NCOSLevelResponseDto(
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
        const sr = new ServiceRequest(req)

        const updates = new Dictionary<internal.NCOSLevel>()
        for (const id of Object.keys(patches)) {
            const oldEntity = await this.ncosLevelService.read(+id, sr)
            const entity = await patchToEntity<internal.NCOSLevel, NCOSLevelRequestDto>(oldEntity, patches[id], NCOSLevelRequestDto)
            updates[id] = entity
        }

        return await this.ncosLevelService.update(updates, sr)
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
            message: 'delete ncos level by id',
            id: ids,
            func: this.delete.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const deletedIds = await this.ncosLevelService.delete(ids, sr)
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
            message: 'read ncos level journal by id',
            id: id,
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }

}
