import {Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Req} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {Operation} from 'helpers/patch.helper'
import {Transactional} from 'typeorm-transactional'
import {number} from 'yargs'

import {NCOSPatternRequestDto} from './dto/ncos-pattern-request.dto'
import {NCOSPatternResponseDto} from './dto/ncos-pattern-response.dto'
import {NCOSPatternService} from './ncos-pattern.service'

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

const resourceName = 'ncos/patterns'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
)
@ApiTags('NCOS')
@Controller(resourceName)
export class NCOSPatternController extends CrudController<NCOSPatternRequestDto, NCOSPatternResponseDto> {
    private readonly log = new LoggerService(NCOSPatternController.name)

    constructor(
        private readonly ncosPatternService: NCOSPatternService,
        private readonly journalService: JournalService,
    ) {
        super(resourceName, ncosPatternService, journalService)
    }

    @Post()
    @ApiCreatedResponse(NCOSPatternResponseDto)
    @ApiBody({
        type: NCOSPatternRequestDto,
        isArray: true,
    })
    @Transactional()
    async create(
        @Body(new ParseOneOrManyPipe({items: NCOSPatternRequestDto})) createDto: NCOSPatternRequestDto[],
        @Req() req: Request,
    ): Promise<NCOSPatternResponseDto[]> {
        this.log.debug({
            message: 'create ncos pattern bulk',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const sets = await Promise.all(createDto.map(async set => set.toInternal()))
        const created = await this.ncosPatternService.create(sets, sr)
        return await Promise.all(created.map(async set => new NCOSPatternResponseDto(
            set,
            {url: req.url},
        )))
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(NCOSPatternResponseDto)
    async readAll(@Req() req: Request): Promise<[NCOSPatternResponseDto[], number]> {
        this.log.debug({
            message: 'read all ncos pattern',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const [entity, totalCount] =
            await this.ncosPatternService.readAll(sr)
        const responseList = entity.map(e => new NCOSPatternResponseDto(
            e,
            {url: req.url},
        ))
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: NCOSPatternResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, req: Request): Promise<NCOSPatternResponseDto> {
        this.log.debug({
            message: 'read ncos pattern by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        return new NCOSPatternResponseDto(
            await this.ncosPatternService.read(id, new ServiceRequest(req)),
            {url: req.url, containsResourceId: true},
        )
    }

    @Put(':id')
    @ApiOkResponse({
        type: NCOSPatternResponseDto,
    })
    @Transactional()
    async update(@Param('id', ParseIntPipe) id: number, dto: NCOSPatternRequestDto, req: Request): Promise<NCOSPatternResponseDto> {
        this.log.debug({
            message: 'update ncos pattern by id',
            id: id,
            func: this.update.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.NCOSPattern>()
        updates[id] = Object.assign(new NCOSPatternRequestDto(), dto).toInternal({id: id, assignNulls: true})
        const ids = await this.ncosPatternService.update(updates, sr)
        const entity = await this.ncosPatternService.read(ids[0], sr)
        const response = new NCOSPatternResponseDto(
            entity,
            {url: req.url, containsResourceId: true},
        )
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put()
    @ApiPutBody(NCOSPatternRequestDto)
    @Transactional()
    async updateMany(
        @Body(new ParseIdDictionary({items: NCOSPatternRequestDto})) updates: Dictionary<NCOSPatternRequestDto>,
        @Req() req: Request,
    ): Promise<number[]> {
        this.log.debug({message: 'update NCOS patterns bulk', func: this.updateMany.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const sets = new Dictionary<internal.NCOSPattern>()
        for (const id of Object.keys(updates)) {
            const dto: NCOSPatternRequestDto = updates[id]
            sets[id] = dto.toInternal({id: parseInt(id), assignNulls: true})
        }
        return await this.ncosPatternService.update(sets, sr)
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
    ): Promise<NCOSPatternResponseDto> {
        this.log.debug({
            message: 'patch ncos pattern by id',
            id: id,
            func: this.adjust.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)

        const oldEntity = await this.ncosPatternService.read(id, sr)
        const entity = await patchToEntity<internal.NCOSPattern, NCOSPatternRequestDto>(oldEntity, patch, NCOSPatternRequestDto)
        const update = new Dictionary<internal.NCOSPattern>(id.toString(), entity)

        const ids = await this.ncosPatternService.update(update, sr)
        const updatedEntity = await this.ncosPatternService.read(ids[0], sr)
        const response = new NCOSPatternResponseDto(
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

        const updates = new Dictionary<internal.NCOSPattern>()
        for (const id of Object.keys(patches)) {
            const oldEntity = await this.ncosPatternService.read(+id, sr)
            const entity = await patchToEntity<internal.NCOSPattern, NCOSPatternRequestDto>(oldEntity, patches[id], NCOSPatternRequestDto)
            updates[id] = entity
        }

        return await this.ncosPatternService.update(updates, sr)
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
            message: 'delete ncos pattern by id',
            id: ids,
            func: this.delete.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const deletedIds = await this.ncosPatternService.delete(ids, sr)
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
            message: 'read ncos pattern journal by id',
            id: id,
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }

}
