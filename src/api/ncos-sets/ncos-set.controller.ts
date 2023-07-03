import {Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Req, UnprocessableEntityException} from '@nestjs/common'
import {ApiBody, ApiConsumes, ApiExtraModels, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'
import {Operation} from 'helpers/patch.helper'
import {RbacRole} from '../../config/constants.config'
import {CrudController} from '../../controllers/crud.controller'
import {ApiCreatedResponse} from '../../decorators/api-created-response.decorator'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'
import {Auth} from '../../decorators/auth.decorator'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {LoggerService} from '../../logger/logger.service'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {JournalService} from '../journals/journal.service'
import {CreateResponseDto} from '../../dto/create-response.dto'
import {PaginatedDto} from '../../dto/paginated.dto'
import {PatchDto} from '../../dto/patch.dto'
import {NCOSSetRequestDto} from './dto/ncos-set-request.dto'
import {NCOSSetLevelRequestDto} from './dto/ncos-set-level-request.dto'
import {NCOSSetLevelResponseDto} from './dto/ncos-set-level-response.dto'
import {NCOSSetResponseDto} from './dto/ncos-set-response.dto'
import {NCOSSetService} from './ncos-set.service'
import {ParseOneOrManyPipe} from '../../pipes/parse-one-or-many.pipe'
import {number} from 'yargs'
import {ParseIntIdArrayPipe} from '../../pipes/parse-int-id-array.pipe'
import {ParamOrBody} from '../../decorators/param-or-body.decorator'
import {internal} from '../../entities'
import {ApiPutBody} from '../../decorators/api-put-body.decorator'
import {ParseIdDictionary} from '../../pipes/parse-id-dictionary.pipe'
import {Dictionary} from '../../helpers/dictionary.helper'
import {patchToEntity, Operation as PatchOperation} from '../../helpers/patch.helper'
import {ParsePatchPipe} from '../../pipes/parse-patch.pipe'

const resourceName = 'ncos/sets'

@Auth(
    RbacRole.system,
    RbacRole.admin,
    RbacRole.reseller,
)
@ApiTags('NCOS')
@ApiExtraModels(CreateResponseDto, PaginatedDto)
@Controller(resourceName)
export class NCOSSetController extends CrudController<NCOSSetRequestDto, NCOSSetResponseDto> {
    private readonly log = new LoggerService(NCOSSetController.name)

    constructor(
        private readonly ncosSetService: NCOSSetService,
        private readonly journalService: JournalService,
    ) {
        super(resourceName, ncosSetService, journalService)
    }


    /* NCOS Set Level */


    @Post(':id/levels')
    @ApiCreatedResponse(NCOSSetLevelRequestDto)
    @ApiBody({
        type: NCOSSetLevelRequestDto,
        isArray: true,
    })
    async createLevel(
        @Param('id') id: number,
        @Body(new ParseOneOrManyPipe({items: NCOSSetLevelRequestDto})) createDto: NCOSSetLevelRequestDto[],
        @Req() req: Request,
    ): Promise<NCOSSetLevelResponseDto[]> {
        this.log.debug({
            message: 'create ncos set level bulk',
            func: this.createLevel.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const setLevels = await Promise.all(createDto.map(async setLevel => setLevel.toInternal()))
        const created = await this.ncosSetService.createLevel(id, setLevels, sr)
        return await Promise.all(created.map(async setLevel => new NCOSSetLevelResponseDto(setLevel)))
    }

    @Get(':id?/levels')
    @ApiOkResponse({
        type: NCOSSetLevelResponseDto,
    })
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(NCOSSetLevelResponseDto)
    async readLevelAll(
        @Param('id') id: number,
        @Req() req: Request,
    ): Promise<[NCOSSetLevelResponseDto[], number]> {
        this.log.debug({
            message: 'read all ncos set level',
            func: this.readLevelAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const [entity, totalCount] =
            await this.ncosSetService.readLevelAll(sr, id)
        const responseList = entity.map(e => new NCOSSetLevelResponseDto(e))
        return [responseList, totalCount]
    }

    @Get(':id?/levels/:levelId')
    @ApiOkResponse({
        type: NCOSSetLevelResponseDto,
    })
    async readLevel(
        @Req() req: Request,
        @Param('levelId', ParseIntPipe) levelId: number,
        @Param('id') id?: number,
    ): Promise<NCOSSetLevelResponseDto> {
        this.log.debug({
            message: 'read ncos set level by id',
            id: levelId,
            func: this.readLevel.name,
            url: req.url,
            method: req.method,
        })
        const response = await this.ncosSetService.readLevel(id, levelId, new ServiceRequest(req))
        return new NCOSSetLevelResponseDto(response)
    }

    @Delete(':id?/levels/:levelId')
    @ApiOkResponse({})
    async deleteLevel(
        @Req() req: Request,
        @Param('levelId', ParseIntPipe) levelId: number,
        @Param('id') id: number,
    ): Promise<number> {
        this.log.debug({
            message: 'delete ncos set level by id',
            id: levelId,
            func: this.deleteLevel.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const response = await this.ncosSetService.deleteLevel(id, levelId, sr)
        await this.journalService.writeJournal(sr, levelId, {})
        return response
    }

    @Get(':id?/levels/:levelId/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journalLevel(
        @Req() req: Request,
        @Param('id') id: number,
        @Param('levelId') levelId: number,
    ) {
        this.log.debug({
            message: 'read ncos set journal level by id',
            id: levelId,
            func: this.journalLevel.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(levelId, req)
    }


    /* NCOS Set */


    @Post()
    @ApiCreatedResponse(NCOSSetResponseDto)
    @ApiBody({
        type: NCOSSetRequestDto,
        isArray: true,
    })
    async create(
        @Body(new ParseOneOrManyPipe({items: NCOSSetRequestDto})) createDto: NCOSSetRequestDto[],
        @Req() req: Request,
    ): Promise<NCOSSetResponseDto[]> {
        this.log.debug({
            message: 'create ncos set bulk',
            func: this.create.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const sets = await Promise.all(createDto.map(async set => set.toInternal()))
        const created = await this.ncosSetService.create(sets, sr)
        return await Promise.all(created.map(async set => new NCOSSetResponseDto(req.url, set)))
    }

    @Auth(
        RbacRole.system,
        RbacRole.admin,
        RbacRole.reseller,
        RbacRole.subscriberadmin,
    )
    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(NCOSSetResponseDto)
    async readAll(@Req() req: Request): Promise<[NCOSSetResponseDto[], number]> {
        this.log.debug({
            message: 'read all ncos set',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const [entity, totalCount] =
            await this.ncosSetService.readAll(sr)
        const responseList = entity.map(e => new NCOSSetResponseDto(req.url, e))
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
        type: NCOSSetResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, req: Request): Promise<NCOSSetResponseDto> {
        this.log.debug({
            message: 'read ncos set by id',
            id: id,
            func: this.read.name,
            url: req.url,
            method: req.method,
        })
        return new NCOSSetResponseDto(
            req.url,
            await this.ncosSetService.read(id, new ServiceRequest(req)),
        )
    }

    @Put(':id')
    @ApiOkResponse({
        type: NCOSSetResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number, dto: NCOSSetRequestDto, req: Request): Promise<NCOSSetResponseDto> {
        this.log.debug({
            message: 'update ncos set by id',
            id: id,
            func: this.update.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const updates = new Dictionary<internal.NCOSSet>()
        updates[id] = Object.assign(new NCOSSetRequestDto(), dto).toInternal({id: id})
        const ids = await this.ncosSetService.update(updates, sr)
        const entity = await this.ncosSetService.read(ids[0], sr)
        const response = new NCOSSetResponseDto(req.url, entity)
        await this.journalService.writeJournal(sr, id, response)
        return response
    }

    @Put()
    @ApiPutBody(NCOSSetRequestDto)
    async updateMany(
        @Body(new ParseIdDictionary({items: NCOSSetRequestDto})) updates: Dictionary<NCOSSetRequestDto>,
        @Req() req,
    ) {
        this.log.debug({message: 'update NCOS Sets bulk', func: this.updateMany.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const sets = new Dictionary<internal.NCOSSet>()
        for (const id of Object.keys(updates)) {
            const dto: NCOSSetRequestDto = updates[id]
            sets[id] = dto.toInternal({id: parseInt(id)})
        }
        return await this.ncosSetService.update(sets, sr)
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
    ): Promise<NCOSSetResponseDto> {
        this.log.debug({
            message: 'patch ncos set by id',
            id: id,
            func: this.adjust.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)

        const oldEntity = await this.ncosSetService.read(id, sr)
        const entity = await patchToEntity<internal.NCOSSet, NCOSSetRequestDto>(oldEntity, patch, NCOSSetRequestDto)
        const update = new Dictionary<internal.NCOSSet>(id.toString(), entity)

        const ids = await this.ncosSetService.update(update, sr)
        const updatedEntity = await this.ncosSetService.read(ids[0], sr)
        const response = new NCOSSetResponseDto(req.url, updatedEntity)
        await this.journalService.writeJournal(sr, id, response)

        return response
    }

    @Patch()
    @ApiConsumes('application/json-patch+json')
    @ApiPutBody(PatchDto)
    async adjustMany(
        @Body(new ParseIdDictionary({items: PatchDto, valueIsArray: true})) patches: Dictionary<PatchOperation[]>,
        @Req() req,
    ) {
        const sr = new ServiceRequest(req)

        const updates = new Dictionary<internal.NCOSSet>()
        for (const id of Object.keys(patches)) {
            const oldEntity = await this.ncosSetService.read(+id, sr)
            const entity = await patchToEntity<internal.NCOSSet, NCOSSetRequestDto>(oldEntity, patches[id], NCOSSetRequestDto)
            updates[id] = entity
        }

        return await this.ncosSetService.update(updates, sr)
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
            message: 'delete ncos set by id',
            id: ids,
            func: this.delete.name,
            url: req.url,
            method: req.method,
        })
        const sr = new ServiceRequest(req)
        const deletedIds = await this.ncosSetService.delete(ids, sr)
        for (const deletedId of deletedIds) {
            await this.journalService.writeJournal(sr, deletedId, {})
        }
        return deletedIds
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, @Req() req: Request) {
        this.log.debug({
            message: 'read ncos set journal by id',
            id: id,
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }

}
